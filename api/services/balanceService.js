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
};

export default BalanceService;