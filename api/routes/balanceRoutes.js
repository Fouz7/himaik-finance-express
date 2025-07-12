import express from 'express';
import BalanceController from '../controllers/balanceController.js';

const router = express.Router();

router.get('/', BalanceController.get);
router.get('/income', BalanceController.getTotalIncome);
router.get('/outcome', BalanceController.getTotalOutcome);

export default router;