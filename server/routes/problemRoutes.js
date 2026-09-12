const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const problemController = require('../controllers/problemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

router.post('/upload-image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image provided' });
  }
  const imageUrl = `http://localhost:${process.env.PORT || 5001}/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

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
router.post('/upload-university-solution', requireRole('university'), problemController.uploadUniversitySolution);
router.post('/verify-university-solution', requireRole('government'), problemController.verifyUniversitySolution);
router.post('/submit-industry-bid', requireRole('industry'), problemController.submitIndustryBid);
router.post('/allot-industry', requireRole('government'), problemController.allotIndustry);
router.post('/upload-industry-work', requireRole('industry'), problemController.uploadIndustryWork);
router.post('/citizen-confirm', requireRole('citizen'), problemController.confirmCitizenFix);
router.post('/citizen-reject', requireRole('citizen'), problemController.rejectCitizenFix);

module.exports = router;
