import BalanceService from '../services/balanceService.js';

const BalanceController = {
    get: async (req, res) => {
        const result = await BalanceService.getCurrentBalance();

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json(result.data);
    },
};

export default BalanceController;