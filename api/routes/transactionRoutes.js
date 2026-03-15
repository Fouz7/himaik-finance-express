import express from 'express';
import TransactionController from '../controllers/transactionController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', TransactionController.getAll);
router.post('/', authMiddleware, TransactionController.create);
router.put('/:id', authMiddleware, TransactionController.update);
router.delete('/:id', authMiddleware, TransactionController.remove);

export default router;