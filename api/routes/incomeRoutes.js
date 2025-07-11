import express from 'express';
import IncomeController from '../controllers/incomeController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', IncomeController.getAll);
router.post('/', authMiddleware, IncomeController.create);
router.delete('/:id', authMiddleware, IncomeController.remove);

export default router;