import express from 'express';
import multer from 'multer';
import BalanceController from '../controllers/balanceController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only JPG or PNG are allowed'));
    }
});

router.get('/', BalanceController.get);
router.get('/income', BalanceController.getTotalIncome);
router.get('/outcome', BalanceController.getTotalOutcome);
router.post('/evidence', authMiddleware, upload.single('file'), BalanceController.uploadBalanceEvidence);
router.get('/evidence/latest', BalanceController.showBalanceEvidence);

export default router;