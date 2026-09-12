const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const problemController = require('../controllers/problemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const supabase = require('../config/supabase');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Only image files are allowed.'));
    }

    return callback(null, true);
  },
});

function handleImageUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'Image must be 10 MB or smaller.' });
    }

    return res.status(400).json({ success: false, error: error.message || 'Invalid image upload.' });
  });
}

router.post('/upload-image', requireAuth, handleImageUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image provided' });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'problem-images';
  const filePath = `problem-evidence/${req.user.id}/${crypto.randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return res.json({ success: true, url: data.publicUrl });
  } catch (error) {
    console.error('Supabase evidence upload failed:', error);
    return res.status(502).json({ success: false, error: 'Evidence storage upload failed.' });
  }
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
