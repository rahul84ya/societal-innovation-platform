const pool = require('../config/db');

function parsePositiveInteger(value, fieldName) {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsedValue;
}

// 2. University Uploads Solution
async function uploadUniversitySolution(problem_id, university_id, notes, pdf_url) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');

  if (!pdf_url || typeof pdf_url !== 'string' || !pdf_url.trim()) {
    throw new Error('A PDF solution file is required. Please upload a PDF before submitting.');
  }

  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      `SELECT * FROM problems WHERE id = $1 FOR UPDATE;`, [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }
    const problemRecord = problemResult.rows[0];

    if (problemRecord.problem_status !== 'university_assigned') {
      throw new Error('Project must be in university_assigned state to upload solution.');
    }

    const proposalResult = await databaseClient.query(
      `SELECT * FROM proposals WHERE problem_id = $1 AND proposal_status = 'allotted' ORDER BY id DESC LIMIT 1;`, [problemId]
    );

    if (proposalResult.rows.length === 0 || Number(proposalResult.rows[0].university_id) !== Number(university_id)) {
      throw new Error('Only the allotted university can upload the solution.');
    }

    await databaseClient.query(
      `UPDATE problems SET problem_status = 'solution_uploaded', current_milestone_stage = 1, university_solution_url = $2 WHERE id = $1;`,
      [problemId, pdf_url.trim()]
    );
    await databaseClient.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
      [
        problemRecord.user_id,
        `University has uploaded the solution for issue #${problemId}. Awaiting government verification.`,
      ]
    );

    await databaseClient.query('COMMIT');
    return { success: true, message: 'Solution uploaded successfully.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

// 3. Government Verifies Solution -> Tender Raised (10% to university)
async function verifyUniversitySolution(problem_id, action, feedback) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      `SELECT * FROM problems WHERE id = $1 FOR UPDATE;`, [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found.');
    }
    const problemRecord = problemResult.rows[0];

    if (problemRecord.problem_status !== 'solution_uploaded') {
      throw new Error('Project must be in solution_uploaded state for verification.');
    }

    const proposalResult = await databaseClient.query(
      `SELECT * FROM proposals WHERE problem_id = $1 AND proposal_status = 'allotted' ORDER BY id DESC LIMIT 1;`, [problemId]
    );
    const proposalRecord = proposalResult.rows[0];

    if (action === 'reject') {
      await databaseClient.query(
        `UPDATE problems SET problem_status = 'university_assigned', citizen_feedback_notes = $2 WHERE id = $1;`,
        [problemId, feedback || 'Rework required']
      );
      await databaseClient.query('COMMIT');
      return { success: true, message: 'Solution rejected for rework.' };
    }

    const payoutAmount = Number(problemRecord.allocated_budget) * 0.1;
    await databaseClient.query(
      `UPDATE problems SET problem_status = 'tender_raised', current_milestone_stage = 2 WHERE id = $1;`,
      [problemId]
    );
    await databaseClient.query(
      `INSERT INTO financial_ledger (problem_id, proposal_id, tranche_number, amount_released, recipient_type) VALUES ($1, $2, 2, $3, 'university');`,
      [problemId, proposalRecord.id, payoutAmount.toFixed(2)]
    );
    await databaseClient.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
      [
        proposalRecord.university_id,
        `Your solution for project #${problemId} was verified. The remaining 10% university tranche (₹${payoutAmount.toFixed(2)}) has been released.`
      ]
    );

    await databaseClient.query('COMMIT');
    return { success: true, message: 'Solution verified, 10% tranche released, tender raised.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

// 4. Industry Submits Bid (handled in universityService/projectService - let's add it here for separation)
async function submitIndustryBid(problem_id, industry_id, notes, proposal_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const proposalId = parsePositiveInteger(proposal_id, 'Proposal ID');
  const databaseClient = await pool.connect();
  
  try {
    await databaseClient.query('BEGIN');
    const problemResult = await databaseClient.query(`SELECT * FROM problems WHERE id = $1;`, [problemId]);
    if (problemResult.rows.length === 0 || problemResult.rows[0].problem_status !== 'tender_raised') {
      throw new Error('Project must be in tender_raised state.');
    }
    const proposalResult = await databaseClient.query(
      `SELECT * FROM proposals
       WHERE id = $1 AND problem_id = $2 AND proposal_status = 'allotted'
       FOR UPDATE;`,
      [proposalId, problemId]
    );
    const proposalRecord = proposalResult.rows[0];

    if (!proposalRecord) {
      throw new Error('No allotted university proposal exists for this tender.');
    }

    if (proposalRecord.industry_id) {
      throw new Error('This tender already has an industry bid.');
    }
    
    await databaseClient.query(
      `UPDATE proposals SET industry_id = $1, corporate_contribution_notes = $2 WHERE id = $3;`,
      [industry_id, notes, proposalRecord.id]
    );
    
    await databaseClient.query('COMMIT');
    return { success: true, message: 'Industry bid submitted.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

// 5. Government Allots to Industry (30% advance)
async function allotIndustry(problem_id, proposal_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const databaseClient = await pool.connect();
  
  try {
    await databaseClient.query('BEGIN');
    const problemResult = await databaseClient.query(`SELECT * FROM problems WHERE id = $1 FOR UPDATE;`, [problemId]);
    if (problemResult.rows.length === 0 || problemResult.rows[0].problem_status !== 'tender_raised') {
      throw new Error('Project must be in tender_raised state.');
    }
    const problemRecord = problemResult.rows[0];

    const proposalResult = await databaseClient.query(`SELECT * FROM proposals WHERE id = $1 FOR UPDATE;`, [proposal_id]);
    const proposalRecord = proposalResult.rows[0];
    if (!proposalRecord.industry_id) {
      throw new Error('No industry has bid on this proposal.');
    }

    const advanceAmount = Number(problemRecord.allocated_budget) * 0.3;
    await databaseClient.query(`UPDATE problems SET problem_status = 'industry_assigned' WHERE id = $1;`, [problemId]);
    await databaseClient.query(
      `INSERT INTO financial_ledger (problem_id, proposal_id, tranche_number, amount_released, recipient_type) VALUES ($1, $2, 3, $3, 'industry');`,
      [problemId, proposalRecord.id, advanceAmount.toFixed(2)]
    );
    await databaseClient.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
      [
        proposalRecord.industry_id,
        `Project #${problemId} allotted to your industry. 30% advance (₹${advanceAmount.toFixed(2)}) released.`
      ]
    );

    await databaseClient.query('COMMIT');
    return { success: true, message: 'Industry assigned and 30% advance released.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

// 6. Industry Uploads Work
async function uploadIndustryWork(problem_id, industry_id, notes, image_url) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');

  if (!image_url || typeof image_url !== 'string' || !image_url.trim()) {
    throw new Error('A photo of the completed work is required. Please upload an image before submitting.');
  }

  const databaseClient = await pool.connect();
  
  try {
    await databaseClient.query('BEGIN');
    const problemResult = await databaseClient.query(`SELECT * FROM problems WHERE id = $1 FOR UPDATE;`, [problemId]);
    if (problemResult.rows.length === 0 || problemResult.rows[0].problem_status !== 'industry_assigned') {
      throw new Error('Project must be in industry_assigned state.');
    }
    const problemRecord = problemResult.rows[0];

    const proposalResult = await databaseClient.query(
      `SELECT * FROM proposals WHERE problem_id = $1 AND proposal_status = 'allotted' ORDER BY id DESC LIMIT 1;`, [problemId]
    );
    if (proposalResult.rows.length === 0 || Number(proposalResult.rows[0].industry_id) !== Number(industry_id)) {
      throw new Error('Only the allotted industry can upload work.');
    }

    await databaseClient.query(`UPDATE problems SET problem_status = 'pending_citizen_verification', industry_work_url = $2, problem_solved_images_url = $3 WHERE id = $1;`, [problemId, notes, image_url]);
    await databaseClient.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
      [
        problemRecord.user_id,
        `Industry has uploaded the final work for issue #${problemId}. Please verify the fix.`
      ]
    );

    await databaseClient.query('COMMIT');
    return { success: true, message: 'Industry work uploaded successfully.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

// 7. Citizen Verifies (replaces confirmCitizenFix)
async function confirmCitizenFix(problem_id, citizen_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');
    const problemResult = await databaseClient.query(`SELECT * FROM problems WHERE id = $1 FOR UPDATE;`, [problemId]);
    if (problemResult.rows.length === 0) throw new Error('Problem not found.');
    const problemRecord = problemResult.rows[0];

    if (Number(problemRecord.user_id) !== Number(citizen_id)) {
      throw new Error('Only the citizen who submitted this issue can confirm the fix.');
    }
    if (problemRecord.problem_status !== 'pending_citizen_verification') {
      throw new Error('Project must be in pending_citizen_verification state.');
    }

    const proposalResult = await databaseClient.query(
      `SELECT * FROM proposals WHERE problem_id = $1 AND proposal_status = 'allotted' ORDER BY id DESC LIMIT 1;`, [problemId]
    );
    const proposalRecord = proposalResult.rows[0];
    
    const payoutAmount = Number(problemRecord.allocated_budget) * 0.2;

    await databaseClient.query(`UPDATE problems SET problem_status = 'solved', citizen_verified_at = NOW() WHERE id = $1;`, [problemId]);
    await databaseClient.query(
      `INSERT INTO financial_ledger (problem_id, proposal_id, tranche_number, amount_released, recipient_type) VALUES ($1, $2, 4, $3, 'industry');`,
      [problemId, proposalRecord.id, payoutAmount.toFixed(2)]
    );
    
    await databaseClient.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
      [
        proposalRecord.industry_id,
        `Citizen verified the work for #${problemId}. Final 20% tranche (₹${payoutAmount.toFixed(2)}) released.`
      ]
    );

    await databaseClient.query('COMMIT');
    return { success: true, message: 'Citizen verification recorded, final 20% released, project solved.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

// Rejection by citizen
async function processCitizenObjection(problem_id, rejection_reason, citizen_id) {
  const problemId = parsePositiveInteger(problem_id, 'Problem ID');
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');
    const problemResult = await databaseClient.query(`SELECT * FROM problems WHERE id = $1 FOR UPDATE;`, [problemId]);
    if (problemResult.rows.length === 0) throw new Error('Problem not found.');
    const problemRecord = problemResult.rows[0];

    if (Number(problemRecord.user_id) !== Number(citizen_id)) {
      throw new Error('Only the reporting citizen can reject the fix.');
    }
    if (problemRecord.problem_status !== 'pending_citizen_verification') {
      throw new Error('Can only reject when pending_citizen_verification.');
    }

    await databaseClient.query(
      `UPDATE problems SET problem_status = 'industry_assigned', citizen_feedback_notes = $2 WHERE id = $1;`,
      [problemId, rejection_reason]
    );
    
    const proposalResult = await databaseClient.query(
      `SELECT * FROM proposals WHERE problem_id = $1 AND proposal_status = 'allotted' ORDER BY id DESC LIMIT 1;`, [problemId]
    );
    if(proposalResult.rows.length > 0) {
       await databaseClient.query(
          `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
          [
            proposalResult.rows[0].industry_id,
            `Citizen rejected the work for #${problemId}. Reason: ${rejection_reason}. Please rework and re-upload.`
          ]
       );
    }
    
    await databaseClient.query('COMMIT');
    return { success: true, message: 'Objection recorded. Rework requested.' };
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    throw error;
  } finally {
    databaseClient.release();
  }
}

module.exports = {
  uploadUniversitySolution,
  verifyUniversitySolution,
  submitIndustryBid,
  allotIndustry,
  uploadIndustryWork,
  confirmCitizenFix,
  processCitizenObjection,
};
