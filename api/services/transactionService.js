import db from '../config/db.js';

const TransactionService = {
    addExpense: async (expenseData) => {
        const {nominal, notes, createdBy} = expenseData;

        if (!nominal || !notes || !createdBy) {
            return {success: false, statusCode: 400, message: 'Missing required fields: nominal, notes, createdBy.'};
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const lastTransactionRes = await client.query(
                'SELECT balance FROM "financeschema"."transactions" ORDER BY "createdAt" DESC, "transactionId" DESC LIMIT 1'
            );
            const lastBalance = lastTransactionRes.rows.length > 0 ? parseFloat(lastTransactionRes.rows[0].balance) : 0;

            const newBalance = lastBalance - parseFloat(nominal);

            const transactionQuery = `
                INSERT INTO "financeschema"."transactions" (debit, credit, balance, notes, "createdBy")
                VALUES ($1, $2, $3, $4, $5) RETURNING *;
            `;
            const transactionValues = [nominal, 0, newBalance, notes, createdBy];
            const newTransaction = await client.query(transactionQuery, transactionValues);

            await client.query('COMMIT');

            return {
                success: true,
                statusCode: 201,
                message: 'Expense transaction added successfully.',
                data: newTransaction.rows[0],
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during add expense service:', error);
            return {success: false, statusCode: 500, message: 'Server error while adding expense.'};
        } finally {
            client.release();
        }
    },

    deleteTransaction: async (transactionId) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const txRes = await client.query('SELECT * FROM "financeschema"."transactions" WHERE "transactionId" = $1', [transactionId]);
            if (txRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return {success: false, statusCode: 404, message: 'Transaction not found.'};
            }
            const txToDelete = txRes.rows[0];

            if (parseFloat(txToDelete.credit) > 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    statusCode: 400,
                    message: 'Cannot delete an income transaction from this endpoint. Please use the income deletion route.'
                };
            }

            await client.query('DELETE FROM "financeschema"."transactions" WHERE "transactionId" = $1', [transactionId]);

            const balanceAdjustment = parseFloat(txToDelete.debit);

            const updateQuery = `
        UPDATE "financeschema"."transactions"
        SET balance = balance + $1
        WHERE "createdAt" > $2 OR ("createdAt" = $2 AND "transactionId" > $3);
      `;
            await client.query(updateQuery, [balanceAdjustment, txToDelete.createdAt, transactionId]);

            await client.query('COMMIT');
            return {
                success: true,
                statusCode: 200,
                message: 'Transaction deleted and balance recalculated successfully.'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during delete transaction service:', error);
            return {success: false, statusCode: 500, message: 'Server error while deleting transaction.'};
        } finally {
            client.release();
        }
    },

    getAllTransactions: async (options) => {
        const {page = 1, limit = 10} = options;
        const offset = (page - 1) * limit;

        try {
            const totalRes = await db.query('SELECT COUNT(*) FROM "financeschema"."transactions"');
            const totalItems = parseInt(totalRes.rows[0].count, 10);
            const totalPages = Math.ceil(totalItems / limit);

            const query = `
                SELECT *
                FROM "financeschema"."transactions"
                ORDER BY "createdAt" DESC, "transactionId" DESC
                    LIMIT $1
                OFFSET $2;
            `;
            const dataRes = await db.query(query, [limit, offset]);

            return {
                success: true,
                statusCode: 200,
                data: dataRes.rows,
                pagination: {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalItems,
                    totalPages,
                },
            };
        } catch (error) {
            console.error('Error getting all transactions:', error);
            return {success: false, statusCode: 500, message: 'Server error while getting transactions.'};
        }
    },
};

export default TransactionService;