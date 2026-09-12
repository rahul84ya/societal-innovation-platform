const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/pending', requireRole('government'), problemController.getPendingProblems);
router.get('/open-challenges', requireRole('university', 'industry'), problemController.getOpenChallenges);
router.get('/proposals/:problem_id', requireRole('government', 'university', 'industry'), problemController.getSubmittedProposals);
router.get('/consortium-review', requireRole('government'), problemController.getConsortiumReviewQueue);
router.get('/mine', requireRole('citizen'), problemController.getCitizenProblems);
router.get('/active-projects', requireRole('government', 'university', 'industry'), problemController.getActiveProjects);
router.post('/report', requireRole('citizen'), problemController.createProblemReport);
router.post('/audit-review', requireRole('government'), problemController.verifyAndAuditWithAI);
router.post('/submit-bid', requireRole('university', 'industry'), problemController.createConsortiumBid);
router.post('/allot-project', requireRole('government'), problemController.allotConsortiumProject);
router.post('/approve-milestone', requireRole('government'), problemController.approveMilestone);
router.post('/factory-handover', requireRole('industry'), problemController.triggerFactoryHandover);
router.post('/citizen-confirm', requireRole('citizen'), problemController.confirmCitizenFix);
router.post('/citizen-reject', requireRole('citizen'), problemController.rejectCitizenFix);

module.exports = router;
