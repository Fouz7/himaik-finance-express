import express from 'express';
import authRoutes from './authRoutes.js';
import incomeRoutes from './incomeRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import balanceRoutes from './balanceRoutes.js'; // 1. Impor rute saldo

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/incomes', incomeRoutes);
router.use('/transactions', transactionRoutes);
router.use('/balance', balanceRoutes);

export default router;