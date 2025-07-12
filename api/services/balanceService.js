import db from '../config/db.js';

const BalanceService = {
    getCurrentBalance: async () => {
        try {
            const query = `
                SELECT balance
                FROM "financeschema"."transactions"
                ORDER BY "createdAt" DESC, "transactionId" DESC LIMIT 1;
            `;
            const result = await db.query(query);

            const currentBalance = result.rows.length > 0 ? parseFloat(result.rows[0].balance) : 0;

            return {
                success: true,
                statusCode: 200,
                data: {
                    balance: currentBalance,
                },
            };
        } catch (error) {
            console.error('Error getting current balance:', error);
            return {success: false, statusCode: 500, message: 'Server error while fetching balance.'};
        }
    },

    getTotalIncome: async () => {
        try {
            const query = `SELECT SUM(credit) as "totalIncome" FROM "financeschema"."transactions"`;
            const result = await db.query(query);
            const totalIncome = parseFloat(result.rows[0].totalIncome) || 0;

            return {
                success: true,
                statusCode: 200,
                data: {totalIncome},
            };
        } catch (error) {
            console.error('Error getting total income:', error);
            return {success: false, statusCode: 500, message: 'Server error while fetching total income.'};
        }
    },

    getTotalOutcome: async () => {
        try {
            const query = `SELECT SUM(debit) as "totalOutcome" FROM "financeschema"."transactions"`;
            const result = await db.query(query);
            const totalOutcome = parseFloat(result.rows[0].totalOutcome) || 0;

            return {
                success: true,
                statusCode: 200,
                data: {totalOutcome},
            };
        } catch (error) {
            console.error('Error getting total outcome:', error);
            return {success: false, statusCode: 500, message: 'Server error while fetching total outcome.'};
        }
    },
};

export default BalanceService;