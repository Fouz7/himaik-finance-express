import express from 'express';
import BalanceController from '../controllers/balanceController.js';

const router = express.Router();

router.get('/', BalanceController.get);

export default router;