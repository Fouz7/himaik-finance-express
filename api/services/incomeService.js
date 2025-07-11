import db from '../config/db.js';

const IncomeService = {
    addIncome: async (incomeData) => {
        const {name, nominal, transfer_date, createdBy} = incomeData;

        if (!name || !nominal || !transfer_date || !createdBy) {
            return {
                success: false,
                statusCode: 400,
                message: 'Missing required fields: name, nominal, transfer_date, createdBy.'
            };
        }

        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const lastTransactionRes = await client.query(
                'SELECT balance FROM "financeschema"."transactions" ORDER BY "createdAt" DESC, "transactionId" DESC LIMIT 1'
            );
            const lastBalance = lastTransactionRes.rows.length > 0 ? parseFloat(lastTransactionRes.rows[0].balance) : 0;

            const newBalance = lastBalance + parseFloat(nominal);

            const incomeQuery = `
                INSERT INTO "financeschema"."incomedata" (name, nominal, transfer_date, "createdBy")
                VALUES ($1, $2, $3, $4) RETURNING *;
            `;
            const incomeValues = [name, nominal, transfer_date, createdBy];
            const newIncome = await client.query(incomeQuery, incomeValues);

            const transactionQuery = `
                INSERT INTO "financeschema"."transactions" (credit, debit, balance, notes, "createdBy")
                VALUES ($1, $2, $3, $4, $5) RETURNING "transactionId", "createdAt";
            `;
            const transactionValues = [nominal, 0, newBalance, `Income: ${name}`, createdBy];
            const newTransaction = await client.query(transactionQuery, transactionValues);

            await client.query(
                'UPDATE "financeschema"."incomedata" SET "transactionId" = $1 WHERE id = $2',
                [newTransaction.rows[0].transactionId, newIncome.rows[0].id]
            );

            await client.query('COMMIT');

            return {
                success: true,
                statusCode: 201,
                message: 'Income added successfully.',
                data: newIncome.rows[0],
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during add income service:', error);
            return {success: false, statusCode: 500, message: 'Server error while adding income.'};
        } finally {
            client.release();
        }
    },

    deleteIncome: async (incomeId) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const incomeRes = await client.query('SELECT * FROM "financeschema"."incomedata" WHERE id = $1', [incomeId]);
            if (incomeRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return {success: false, statusCode: 404, message: 'Income not found.'};
            }
            const incomeToDelete = incomeRes.rows[0];
            const {nominal, transactionId} = incomeToDelete;

            if (!transactionId) {
                await client.query('ROLLBACK');
                return {success: false, statusCode: 400, message: 'Cannot delete income without a linked transaction.'};
            }

            const txRes = await client.query('SELECT "createdAt" FROM "financeschema"."transactions" WHERE "transactionId" = $1', [transactionId]);
            const deletedTxCreatedAt = txRes.rows[0].createdAt;

            await client.query('DELETE FROM "financeschema"."incomedata" WHERE id = $1', [incomeId]);
            await client.query('DELETE FROM "financeschema"."transactions" WHERE "transactionId" = $1', [transactionId]);

            const updateQuery = `
                UPDATE "financeschema"."transactions"
                SET balance = balance - $1
                WHERE "createdAt" > $2
                   OR ("createdAt" = $2 AND "transactionId" > $3);
            `;
            await client.query(updateQuery, [nominal, deletedTxCreatedAt, transactionId]);

            await client.query('COMMIT');
            return {success: true, statusCode: 200, message: 'Income deleted and balance recalculated successfully.'};

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during delete income service:', error);
            return {success: false, statusCode: 500, message: 'Server error while deleting income.'};
        } finally {
            client.release();
        }
    },

    getAllIncomes: async (options) => {
        const {page = 1, limit = 10} = options;
        const offset = (page - 1) * limit;

        try {
            const totalRes = await db.query('SELECT COUNT(*) FROM "financeschema"."incomedata"');
            const totalItems = parseInt(totalRes.rows[0].count, 10);
            const totalPages = Math.ceil(totalItems / limit);

            const query = `
                SELECT *
                FROM "financeschema"."incomedata"
                ORDER BY "createdAt" DESC
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
            console.error('Error getting all incomes:', error);
            return {success: false, statusCode: 500, message: 'Server error while getting incomes.'};
        }
    },
};

export default IncomeService;