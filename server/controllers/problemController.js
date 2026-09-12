const pool = require('../config/db');
const { findSimilarProblems, generateProblemEmbedding, serializeVector } = require('../services/embeddingService');
const { analyzeProblemWithLLM } = require('../services/aiService');
const { submitProposal, allotProjectToUniversity } = require('../services/universityService');
const {
  releaseMilestoneTranche,
  submitFinalVerificationRequest,
  processCitizenObjection,
  confirmCitizenFix,
} = require('../services/projectService');

const severityMap = {
  High: 5,
  Medium: 3,
  Low: 1,
};

function normalizeSeverityScore(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return 3;
  }

  if (typeof rawValue === 'number') {
    return Math.max(1, Math.min(5, Math.round(rawValue)));
  }

  const value = String(rawValue).trim();
  const upperValue = value.toUpperCase();

  if (severityMap[upperValue] !== undefined) {
    return severityMap[upperValue];
  }

  if (upperValue === 'HIGH') return 5;
  if (upperValue === 'MEDIUM') return 3;
  if (upperValue === 'LOW') return 1;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return Math.max(1, Math.min(5, Math.round(numericValue)));
  }

  return 3;
}

exports.createProblemReport = async (req, res) => {
  const citizenId = req.user.id;
  const title = req.body.title;
  const description = req.body.description;
  const imageUrl = req.body.image_url ?? null;
  const category = req.body.category || 'general';
  const severityScore = Number(req.body.severity_score ?? 3);

  if (!citizenId) {
    return res.status(400).json({ success: false, error: 'Citizen or user identifier is required.' });
  }

  if (!title || title.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Title parameter fails strict database criteria (minimum 5 characters).' });
  }

  if (!description || description.trim().length < 20) {
    return res.status(400).json({ success: false, error: 'Description parameter fails strict database criteria (minimum 20 characters).' });
  }

  if (!Number.isInteger(severityScore) || severityScore < 1 || severityScore > 5) {
    return res.status(400).json({ success: false, error: 'Severity score must be an integer between 1 and 5.' });
  }

  const databaseClient = await pool.connect();
  let embedding = null;

  try {
    embedding = serializeVector(await generateProblemEmbedding(title, description));
  } catch (embeddingError) {
    console.error('Problem embedding generation failed; report will be stored without an embedding:', embeddingError.message);
  }

  try {
    await databaseClient.query('BEGIN');

    const problemInsertQuery = `
      INSERT INTO problems (user_id, title, description, image_url, category, severity_score, embedding, problem_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'reported')
      RETURNING *;
    `;

    const problemResult = await databaseClient.query(problemInsertQuery, [
      citizenId,
      title.trim(),
      description.trim(),
      imageUrl,
      category.trim(),
      severityScore,
      embedding,
    ]);

    const loggedProblemRecord = problemResult.rows[0];

    const notificationInsertQuery = `
      INSERT INTO notifications (user_id, message)
      VALUES ($1, $2);
    `;

    await databaseClient.query(notificationInsertQuery, [
      citizenId,
      `Success Alert: Incident report #${loggedProblemRecord.id} has been logged and queued for review.`
    ]);

    await databaseClient.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Data securely committed to PostgreSQL and notification generated.',
      data: loggedProblemRecord,
    });
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    console.error('Critical database exception caught within createProblemReport transaction loop:', error);
    return res.status(500).json({
      success: false,
      error: 'Database transaction block execution failed: ' + error.message,
    });
  } finally {
    databaseClient.release();
  }
};

exports.getPendingProblems = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM problems
      WHERE problem_status = 'reported'
      ORDER BY id DESC;
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Failed to load pending reports:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending problems: ' + error.message,
    });
  }
};

exports.verifyAndAuditWithAI = async (req, res) => {
  const { problem_id, action_type, budget } = req.body;

  if (!problem_id) {
    return res.status(400).json({ success: false, error: 'Problem identifier is required for audit review.' });
  }

  if (!['reject', 'approve'].includes(action_type)) {
    return res.status(400).json({ success: false, error: 'Action type must be either reject or approve.' });
  }

  const databaseClient = await pool.connect();

  try {
    await databaseClient.query('BEGIN');

    const problemResult = await databaseClient.query(
      'SELECT * FROM problems WHERE id = $1 FOR UPDATE;',
      [problem_id]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem record not found for audit review.');
    }

    const problemRecord = problemResult.rows[0];

    if (action_type === 'reject') {
      await databaseClient.query(
        "UPDATE problems SET problem_status = 'rejected_by_govt' WHERE id = $1;",
        [problem_id]
      );

      await databaseClient.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
        [
          problemRecord.user_id,
          `Government audit dismissed report #${problemRecord.id}. It has been marked as rejected_by_govt.`,
        ]
      );

      await databaseClient.query('COMMIT');

      return res.status(200).json({
        success: true,
        decision: 'rejected',
        message: 'Problem was rejected by government review.',
      });
    }

    const historicalMatches = await findSimilarProblems(problemRecord.description || problemRecord.title || '');
    const aiAssessment = await analyzeProblemWithLLM(
      {
        title: problemRecord.title,
        description: problemRecord.description,
        category: problemRecord.category,
        ai_tags: problemRecord.ai_tags || [],
      },
      historicalMatches
    );

    const analysisResult = aiAssessment.result || aiAssessment.raw || {};
    const linkedHistoricalId = analysisResult.linked_historical_id || (historicalMatches[0] && historicalMatches[0].id) || null;
    const normalizedSeverity = normalizeSeverityScore(analysisResult.severity_score || 'Medium');
    const aiTags = Array.isArray(analysisResult.ai_tags) && analysisResult.ai_tags.length > 0
      ? analysisResult.ai_tags
      : ['general'];
    const approvedBudget = Number(budget ?? 0);

    if (analysisResult.isDuplicate) {
      await databaseClient.query(
        'UPDATE problems SET parent_problem_id = $1, problem_status = $2 WHERE id = $3;',
        [linkedHistoricalId, 'solved', problem_id]
      );

      await databaseClient.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
        [
          problemRecord.user_id,
          `Duplicate issue detected. Report #${problemRecord.id} was merged under parent issue #${linkedHistoricalId} and marked as solved.`,
        ]
      );

      await databaseClient.query('COMMIT');

      return res.status(200).json({
        success: true,
        decision: 'duplicate',
        merged_with: linkedHistoricalId,
        message: 'Duplicate report identified and merged into historical record.',
      });
    }

    await databaseClient.query(
      `UPDATE problems
       SET category = $1,
           severity_score = $2,
           ai_tags = $3,
           allocated_budget = $4,
           problem_status = 'open_for_research',
           current_milestone_stage = 0,
           citizen_verified_at = NOW()
       WHERE id = $5;`,
      [
        analysisResult.category || problemRecord.category || 'general',
        normalizedSeverity,
        aiTags,
        approvedBudget,
        problem_id,
      ]
    );

    await databaseClient.query(
      `INSERT INTO notifications (user_id, message) VALUES ($1, $2);`,
      [
        problemRecord.user_id,
        `Government approval granted for report #${problemRecord.id}. It has been moved to open_for_research with allocation reserved at ₹${approvedBudget}.`,
      ]
    );

    await databaseClient.query('COMMIT');

    return res.status(200).json({
      success: true,
      decision: 'approved',
      data: {
        problem_id,
        category: analysisResult.category || problemRecord.category || 'general',
        severity_score: analysisResult.severity_score || 'Medium',
        ai_tags: aiTags,
        allocated_budget: approvedBudget,
      },
    });
  } catch (error) {
    await databaseClient.query('ROLLBACK');
    console.error('Audit transaction failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Audit review transaction failed: ' + error.message,
    });
  } finally {
    databaseClient.release();
  }
};

exports.getOpenChallenges = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM problems WHERE problem_status = 'open_for_research' ORDER BY id DESC;"
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch open research challenges:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch open challenges: ' + error.message,
    });
  }
};

exports.getSubmittedProposals = async (req, res) => {
  const { problem_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM proposals WHERE problem_id = $1 ORDER BY id DESC;',
      [problem_id]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch submitted proposals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch proposals: ' + error.message,
    });
  }
};

exports.getConsortiumReviewQueue = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         problems.id AS problem_id,
         problems.title,
         problems.description,
         problems.allocated_budget,
         problems.problem_status,
         proposals.id AS proposal_id,
         proposals.university_id,
         proposals.industry_id,
         proposals.abstract_plan,
         proposals.corporate_contribution_notes,
         proposals.estimated_timeline_weeks,
         proposals.proposal_status
       FROM problems
       JOIN proposals ON proposals.problem_id = problems.id
       WHERE problems.problem_status = 'pending_consortium_review'
         AND proposals.proposal_status = 'pending'
       ORDER BY problems.id DESC, proposals.id DESC;`
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch consortium review queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch consortium review queue: ' + error.message,
    });
  }
};

exports.createConsortiumBid = async (req, res) => {
  const {
    problem_id,
    university_id: requestedUniversityId,
    industry_id: requestedIndustryId,
    abstract_plan,
    estimated_timeline_weeks,
    corporate_contribution_notes,
  } = req.body;

  const universityId = req.user.user_role === 'university' ? req.user.id : requestedUniversityId;
  const industryId = req.user.user_role === 'industry' ? req.user.id : requestedIndustryId;

  try {
    const result = await submitProposal(
      problem_id,
      universityId,
      industryId,
      abstract_plan,
      estimated_timeline_weeks,
      corporate_contribution_notes
    );

    return res.status(201).json(result);
  } catch (error) {
    console.error('Consortium bid submission failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Consortium bid submission failed: ' + error.message,
    });
  }
};

exports.allotConsortiumProject = async (req, res) => {
  const { problem_id, proposal_id } = req.body;

  try {
    const result = await allotProjectToUniversity(problem_id, proposal_id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Project allotment failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Project allotment failed: ' + error.message,
    });
  }
};

exports.getCitizenProblems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM problems
       WHERE user_id = $1
       ORDER BY id DESC;`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch citizen problem trackers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch citizen problem trackers: ' + error.message,
    });
  }
};

exports.getActiveProjects = async (req, res) => {
  try {
    const query = req.user.user_role === 'government'
      ? `SELECT *
         FROM problems
         WHERE problem_status IN ('in_progress', 'rework_in_progress')
         ORDER BY id DESC;`
      : `SELECT problems.*
         FROM problems
         JOIN proposals ON proposals.problem_id = problems.id
         WHERE problems.problem_status IN ('in_progress', 'rework_in_progress')
           AND proposals.proposal_status = 'allotted'
           AND (proposals.university_id = $1 OR proposals.industry_id = $1)
         ORDER BY problems.id DESC;`;
    const values = req.user.user_role === 'government' ? [] : [req.user.id];
    const result = await pool.query(query, values);

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Failed to fetch active projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch active projects: ' + error.message,
    });
  }
};

function sendProjectServiceError(res, error, fallbackMessage) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const isClientError = /required|requires|only|must|already|not found|no allotted|positive|active|supported/i.test(message);

  return res.status(isClientError ? 400 : 500).json({
    success: false,
    error: `${fallbackMessage}: ${message}`,
  });
}

exports.approveMilestone = async (req, res) => {
  try {
    const result = await releaseMilestoneTranche(req.body.problem_id, req.body.tranche_number);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Milestone approval failed:', error);
    return sendProjectServiceError(res, error, 'Milestone approval failed');
  }
};

exports.triggerFactoryHandover = async (req, res) => {
  try {
    const result = await submitFinalVerificationRequest(req.body.problem_id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Factory handover failed:', error);
    return sendProjectServiceError(res, error, 'Factory handover failed');
  }
};

exports.confirmCitizenFix = async (req, res) => {
  try {
    const result = await confirmCitizenFix(req.body.problem_id, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Citizen confirmation failed:', error);
    return sendProjectServiceError(res, error, 'Citizen confirmation failed');
  }
};

exports.rejectCitizenFix = async (req, res) => {
  try {
    const result = await processCitizenObjection(req.body.problem_id, req.body.rejection_reason, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Citizen objection failed:', error);
    return sendProjectServiceError(res, error, 'Citizen objection failed');
  }
};
