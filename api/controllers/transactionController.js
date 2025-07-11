import TransactionService from '../services/transactionService.js';

const TransactionController = {
    create: async (req, res) => {
        const expenseData = {
            ...req.body,
            createdBy: req.user.username,
        };

        const result = await TransactionService.addExpense(expenseData);

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json({message: result.message, data: result.data});
    },

    remove: async (req, res) => {
        const {id} = req.params;
        const result = await TransactionService.deleteTransaction(id);

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json({message: result.message});
    },

    getAll: async (req, res) => {
        const {page, limit = 10} = req.query;
        const validLimit = [5, 10].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;

        const result = await TransactionService.getAllTransactions({page, limit: validLimit});

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json(result);
    },
};

export default TransactionController;