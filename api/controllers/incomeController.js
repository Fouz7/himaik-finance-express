import IncomeService from '../services/incomeService.js';

const IncomeController = {
    create: async (req, res) => {
        const createdBy = req.user ? req.user.username : 'system';
        const incomeData = {
            ...req.body,
            createdBy: createdBy,
        };

        const result = await IncomeService.addIncome(incomeData);

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json({message: result.message, data: result.data});
    },

    remove: async (req, res) => {
        const {id} = req.params;
        const result = await IncomeService.deleteIncome(id);

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json({message: result.message});
    },

    getAll: async (req, res) => {
        const {page, limit = 10} = req.query;
        const validLimit = [5, 10].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;

        const result = await IncomeService.getAllIncomes({page, limit: validLimit});

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json(result);
    },
};

export default IncomeController;