const pool = require('../config/db');

async function submitProposal(
  problem_id,
  university_id,
  industry_id,
  abstract_plan,
  estimated_timeline_weeks,
  corporate_contribution_notes
) {
  const problemId = Number(problem_id);
  const universityId = Number(university_id);
  const industryId = Number(industry_id);
  const timelineWeeks = Number(estimated_timeline_weeks);

  if (!problemId || !universityId || !industryId) {
    throw new Error('Problem ID, university ID, and industry ID are required.');
  }

  if (!abstract_plan || String(abstract_plan).trim().length < 10) {
    throw new Error('Abstract plan must be at least 10 characters long.');
  }

  if (!Number.isInteger(timelineWeeks) || timelineWeeks <= 0) {
    throw new Error('Estimated timeline weeks must be a positive integer.');
  }

  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      'SELECT * FROM problems WHERE id = $1 FOR UPDATE;',
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }

    if (problemResult.rows[0].problem_status !== 'open_for_research') {
      throw new Error('Bids can only be submitted for open research challenges.');
    }

    const usersResult = await databaseClient.query(
      `SELECT id, user_role
       FROM users
       WHERE id IN ($1, $2);`,
      [universityId, industryId]
    );
    const rolesById = new Map(usersResult.rows.map((user) => [Number(user.id), user.user_role]));

    if (rolesById.get(universityId) !== 'university' || rolesById.get(industryId) !== 'industry') {
      throw new Error('The consortium must contain one university lead and one industry lead.');
    }

    const proposalInsertResult = await databaseClient.query(
      `
        INSERT INTO proposals (
          problem_id,
          university_id,
          industry_id,
          abstract_plan,
          corporate_contribution_notes,
          estimated_timeline_weeks,
          proposal_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *;
      `,
      [
        problemId,
        universityId,
        industryId,
        String(abstract_plan).trim(),
        corporate_contribution_notes ? String(corporate_contribution_notes).trim() : '',
        timelineWeeks,
      ]
    );

    await databaseClient.query(
      "UPDATE problems SET problem_status = 'pending_consortium_review' WHERE id = $1;",
      [problemId]
    );

    await databaseClient.query('COMMIT');

    return {
      success: true,
      proposal: proposalInsertResult.rows[0],
      message: 'Consortium proposal submitted successfully and problem moved to pending consortium review.',
    };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    console.error('Failed to submit consortium proposal:', error);
    throw error;
  } finally {
    databaseClient.release();
  }
}

async function allotProjectToUniversity(problem_id, proposal_id) {
  const problemId = Number(problem_id);
  const proposalId = Number(proposal_id);

  if (!problemId || !proposalId) {
    throw new Error('Problem ID and proposal ID are required.');
  }

  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      'SELECT * FROM problems WHERE id = $1 FOR UPDATE;',
      [problemId]
    );

    const proposalResult = await databaseClient.query(
      'SELECT * FROM proposals WHERE id = $1 FOR UPDATE;',
      [proposalId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }

    if (proposalResult.rows.length === 0) {
      throw new Error('Proposal record not found.');
    }

    const problemRecord = problemResult.rows[0];
    const proposalRecord = proposalResult.rows[0];

    if (proposalRecord.problem_id !== problemId) {
      throw new Error('Proposal does not belong to the selected problem.');
    }

    if (problemRecord.problem_status !== 'pending_consortium_review') {
      throw new Error('Only problems awaiting consortium review can be allotted.');
    }

    if (proposalRecord.proposal_status !== 'pending') {
      throw new Error('Only pending proposals can be allotted.');
    }

    if (Number(problemRecord.allocated_budget || 0) <= 0) {
      throw new Error('A positive allocated budget is required before project allotment.');
    }

    const existingAdvanceResult = await databaseClient.query(
      `SELECT id
       FROM financial_ledger
       WHERE problem_id = $1 AND tranche_number = 1
       FOR UPDATE;`,
      [problemId]
    );

    if (existingAdvanceResult.rows.length > 0) {
      throw new Error('The project advance has already been released.');
    }

    const advanceAmount = Number(problemRecord.allocated_budget || 0) * 0.4;

    await databaseClient.query(
      "UPDATE proposals SET proposal_status = 'allotted', allotted_at = NOW() WHERE id = $1;",
      [proposalId]
    );

    await databaseClient.query(
      "UPDATE problems SET problem_status = 'in_progress' WHERE id = $1;",
      [problemId]
    );

    await databaseClient.query(
      `
        INSERT INTO financial_ledger (problem_id, proposal_id, tranche_number, amount_released, recipient_type)
        VALUES ($1, $2, 1, $3, 'university');
      `,
      [problemId, proposalId, Number(advanceAmount).toFixed(2)]
    );

    await databaseClient.query(
      `
        INSERT INTO notifications (user_id, message)
        VALUES ($1, $2), ($3, $4), ($5, $6);
      `,
      [
        problemRecord.user_id,
        `Your issue #${problemId} has been approved and is now in progress under a consortium allotment.`,
        proposalRecord.university_id,
        `Project allotment confirmed for problem #${problemId}. An advance of 40% has been reserved for your university lab.`,
        proposalRecord.industry_id,
        `Project allotment confirmed for problem #${problemId}. Your consortium contribution has been accepted and a 40% advance is now authorised.`,
      ]
    );

    await databaseClient.query('COMMIT');

    return {
      success: true,
      message: 'Project allotted successfully and 40% advance ledger entry created.',
      advance_amount: Number(advanceAmount).toFixed(2),
      problem_id: problemId,
      proposal_id: proposalId,
    };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    console.error('Failed to allot project to university:', error);
    throw error;
  } finally {
    databaseClient.release();
  }
}

module.exports = {
  submitProposal,
  allotProjectToUniversity,
};
