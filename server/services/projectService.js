const pool = require('../config/db');

function parsePositiveInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return parsedValue;
}

async function releaseMilestoneTranche(problem_id, tranche_number) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const trancheNumber = parsePositiveInteger(tranche_number, 'Tranche number');
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    if (trancheNumber !== 2) {
      throw new Error('Only Milestone 1 approval for tranche 2 is supported.');
    }

    const problemResult = await databaseClient.query(
      `SELECT *
       FROM problems
       WHERE id = $1
       FOR UPDATE;`,
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }

    const problemRecord = problemResult.rows[0];

    if (!['in_progress', 'rework_in_progress'].includes(problemRecord.problem_status)) {
      throw new Error('Milestone payout requires a project currently in progress or rework.');
    }

    if (Number(problemRecord.current_milestone_stage) !== 0) {
      throw new Error('Milestone 1 has already been approved or is not the active milestone.');
    }

    const proposalResult = await databaseClient.query(
      `SELECT p.*, university.user_role AS university_role, industry.user_role AS industry_role
       FROM proposals p
       JOIN users university ON university.id = p.university_id
       JOIN users industry ON industry.id = p.industry_id
       WHERE p.problem_id = $1
         AND p.proposal_status = 'allotted'
       ORDER BY p.allotted_at DESC NULLS LAST, p.id DESC
       LIMIT 1
       FOR UPDATE OF p;`,
      [problemId]
    );

    if (proposalResult.rows.length === 0) {
      throw new Error('No allotted consortium proposal exists for this project.');
    }

    const proposalRecord = proposalResult.rows[0];
    const existingLedgerResult = await databaseClient.query(
      `SELECT id
       FROM financial_ledger
       WHERE problem_id = $1 AND tranche_number = $2
       FOR UPDATE;`,
      [problemId, trancheNumber]
    );

    if (existingLedgerResult.rows.length > 0) {
      throw new Error('This milestone tranche has already been released.');
    }

    const payoutAmount = Number(problemRecord.allocated_budget) * 0.3;

    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
      throw new Error('The project must have a positive allocated budget before payout.');
    }

    await databaseClient.query(
      `UPDATE problems
       SET current_milestone_stage = 1
       WHERE id = $1;`,
      [problemId]
    );

    const ledgerResult = await databaseClient.query(
      `INSERT INTO financial_ledger (
         problem_id,
         proposal_id,
         tranche_number,
         amount_released,
         recipient_type
       )
       VALUES ($1, $2, $3, $4, 'university')
       RETURNING *;`,
      [problemId, proposalRecord.id, trancheNumber, payoutAmount.toFixed(2)]
    );

    await databaseClient.query(
      `INSERT INTO notifications (user_id, message)
       VALUES ($1, $2), ($3, $4);`,
      [
        proposalRecord.university_id,
        `Milestone 1 approved for project #${problemId}. A 30% tranche of ₹${payoutAmount.toFixed(2)} has been released to the consortium university lead.`,
        proposalRecord.industry_id,
        `Milestone 1 approved for project #${problemId}. The 30% consortium tranche of ₹${payoutAmount.toFixed(2)} has been released. Factory handover may now be logged.`,
      ]
    );

    await databaseClient.query('COMMIT');

    return {
      success: true,
      problem_id: problemId,
      tranche_number: trancheNumber,
      amount_released: payoutAmount.toFixed(2),
      ledger_entry: ledgerResult.rows[0],
      message: 'Milestone 1 approved and the 30% tranche was released successfully.',
    };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

async function submitFinalVerificationRequest(problem_id, industry_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      `SELECT *
       FROM problems
       WHERE id = $1
       FOR UPDATE;`,
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }

    const problemRecord = problemResult.rows[0];

    if (!['in_progress', 'rework_in_progress'].includes(problemRecord.problem_status)) {
      throw new Error('Factory handover requires a project currently in progress or rework.');
    }

    if (Number(problemRecord.current_milestone_stage) !== 1) {
      throw new Error('Milestone 1 must be approved before factory handover.');
    }

    const proposalResult = await databaseClient.query(
      `SELECT *
       FROM proposals
       WHERE problem_id = $1 AND proposal_status = 'allotted'
       ORDER BY allotted_at DESC NULLS LAST, id DESC
       LIMIT 1;`,
      [problemId]
    );

    if (proposalResult.rows.length === 0) {
      throw new Error('No allotted consortium proposal exists for this project.');
    }

    const proposalRecord = proposalResult.rows[0];

    if (Number(proposalRecord.industry_id) !== Number(industry_id)) {
      throw new Error('Only the allotted industry lead can trigger factory handover.');
    }

    await databaseClient.query(
      `UPDATE problems
       SET problem_status = 'pending_citizen_verification'
       WHERE id = $1;`,
      [problemId]
    );

    await databaseClient.query(
      `INSERT INTO notifications (user_id, message)
       VALUES ($1, $2);`,
      [
        problemRecord.user_id,
        `Urgent citizen review required for issue #${problemId}. Factory deployment has been handed over and the fix is ready for verification.`,
      ]
    );

    await databaseClient.query('COMMIT');

    return {
      success: true,
      problem_id: problemId,
      proposal_id: proposalRecord.id,
      status: 'pending_citizen_verification',
      message: 'Factory handover logged and citizen verification requested.',
    };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

async function processCitizenObjection(problem_id, rejection_reason, citizen_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const reason = String(rejection_reason || '').trim();

  if (reason.length < 5) {
    throw new Error('A rejection reason of at least 5 characters is required.');
  }

  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      `SELECT *
       FROM problems
       WHERE id = $1
       FOR UPDATE;`,
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }

    const problemRecord = problemResult.rows[0];

    if (Number(problemRecord.user_id) !== Number(citizen_id)) {
      throw new Error('Only the citizen who submitted this issue can reject the fix.');
    }

    if (problemRecord.problem_status !== 'pending_citizen_verification') {
      throw new Error('Citizen objection is only available while verification is pending.');
    }

    const panelResult = await databaseClient.query(
      `SELECT
         MAX(CASE WHEN user_role = 'government' THEN id END) AS government_id,
         MAX(CASE WHEN user_role = 'university' THEN id END) AS university_id,
         MAX(CASE WHEN user_role = 'industry' THEN id END) AS industry_id
       FROM users;`
    );

    const panel = panelResult.rows[0];

    if (!panel.government_id || !panel.university_id || !panel.industry_id) {
      throw new Error('Government, university, and industry notification recipients are required.');
    }

    await databaseClient.query(
      `UPDATE problems
       SET problem_status = 'rework_in_progress',
           current_milestone_stage = 1,
           citizen_feedback_notes = $2
       WHERE id = $1;`,
      [problemId, reason]
    );

    await databaseClient.query(
      `INSERT INTO notifications (user_id, message)
       VALUES ($1, $2), ($3, $4), ($5, $6);`,
      [
        panel.government_id,
        `HIGH PRIORITY: Citizen rejected the fix for issue #${problemId}. Reason: ${reason}`,
        panel.university_id,
        `HIGH PRIORITY: Rework required for issue #${problemId}. Citizen objection: ${reason}`,
        panel.industry_id,
        `HIGH PRIORITY: Factory fix rejected for issue #${problemId}. Rework required before final verification. Reason: ${reason}`,
      ]
    );

    await databaseClient.query('COMMIT');

    return {
      success: true,
      problem_id: problemId,
      status: 'rework_in_progress',
      current_milestone_stage: 1,
      ledger_frozen: true,
      message: 'Citizen objection recorded. No ledger entry was created and the final tranche remains frozen.',
    };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

async function confirmCitizenFix(problem_id, citizen_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      `SELECT *
       FROM problems
       WHERE id = $1
       FOR UPDATE;`,
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }

    if (Number(problemResult.rows[0].user_id) !== Number(citizen_id)) {
      throw new Error('Only the citizen who submitted this issue can confirm the fix.');
    }

    if (problemResult.rows[0].problem_status !== 'pending_citizen_verification') {
      throw new Error('Citizen confirmation is only available while verification is pending.');
    }

    await databaseClient.query(
      `UPDATE problems
       SET problem_status = 'solved', citizen_verified_at = NOW()
       WHERE id = $1;`,
      [problemId]
    );

    await databaseClient.query('COMMIT');

    return {
      success: true,
      problem_id: problemId,
      status: 'solved',
      message: 'Citizen verification recorded and the project was marked solved.',
    };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

module.exports = {
  releaseMilestoneTranche,
  submitFinalVerificationRequest,
  processCitizenObjection,
  confirmCitizenFix,
};
