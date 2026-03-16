import db from '../config/db.js';
import {
    lockTransactionLedger,
    recalculateTransactionBalances,
    willDeleteTransactionCauseInsufficientBalance,
    willUpdateTransactionCauseInsufficientBalance,
} from './ledgerService.js';

const TransactionService = {
    addExpense: async (expenseData) => {
        const {nominal, notes, createdBy} = expenseData;

        if (!nominal || !notes || !createdBy) {
            return {success: false, statusCode: 400, message: 'Missing required fields: nominal, notes, createdBy.'};
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            await lockTransactionLedger(client);

            const lastTransactionRes = await client.query(
                'SELECT balance FROM "financeschema"."transactions" ORDER BY "createdAt" DESC, "transactionId" DESC LIMIT 1'
            );
            const lastBalance = lastTransactionRes.rows.length > 0 ? parseFloat(lastTransactionRes.rows[0].balance) : 0;

            if (lastBalance < parseFloat(nominal)) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    statusCode: 400,
                    message: 'Insufficient balance. The expense exceeds the current balance.'
                };
            }

            const newBalance = lastBalance - parseFloat(nominal);

            const transactionQuery = `
                INSERT INTO "financeschema"."transactions" (debit, credit, balance, notes, "createdBy")
                VALUES ($1, $2, $3, $4, $5) RETURNING *;
            `;
            const transactionValues = [nominal, 0, newBalance, notes, createdBy];
            const newTransaction = await client.query(transactionQuery, transactionValues);

            await recalculateTransactionBalances(client);

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

    updateTransaction: async (transactionId, transactionData) => {
        const {nominal, notes, createdBy} = transactionData;

        if (nominal === undefined && notes === undefined && createdBy === undefined) {
            return {
                success: false,
                statusCode: 400,
                message: 'At least one field is required to update transaction.'
            };
        }

        if (nominal !== undefined) {
            const parsedNominal = parseFloat(nominal);
            if (Number.isNaN(parsedNominal) || parsedNominal <= 0) {
                return {success: false, statusCode: 400, message: 'Nominal must be a valid positive number.'};
            }
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            await lockTransactionLedger(client);

            const txRes = await client.query(
                'SELECT * FROM "financeschema"."transactions" WHERE "transactionId" = $1 FOR UPDATE',
                [transactionId]
            );
            if (txRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return {success: false, statusCode: 404, message: 'Transaction not found.'};
            }

            const txToUpdate = txRes.rows[0];
            if (parseFloat(txToUpdate.credit) > 0) {
                const incomeRes = await client.query(
                    'SELECT * FROM "financeschema"."incomedata" WHERE "transactionId" = $1',
                    [transactionId]
                );

                if (incomeRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return {success: false, statusCode: 404, message: 'Linked income not found for this transaction.'};
                }

                const linkedIncome = incomeRes.rows[0];
                const oldCredit = parseFloat(txToUpdate.credit);
                const newNominal = nominal !== undefined ? parseFloat(nominal) : oldCredit;

                const causesInsufficientBalance = await willUpdateTransactionCauseInsufficientBalance(
                    client,
                    transactionId,
                    newNominal,
                    0
                );
                if (causesInsufficientBalance) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        statusCode: 400,
                        message: 'Cannot update income transaction because the balance is insufficient.'
                    };
                }

                const incomeNameFromNotes = notes !== undefined
                    ? notes.replace(/^Income:\s*/i, '').trim()
                    : linkedIncome.name;
                const newIncomeName = incomeNameFromNotes || linkedIncome.name;
                const newCreatedBy = createdBy ?? txToUpdate.createdBy;

                await client.query(
                    `
                    UPDATE "financeschema"."incomedata"
                    SET name = $1,
                        nominal = $2,
                        transfer_date = $3,
                        "createdBy" = $4
                    WHERE id = $5;
                    `,
                    [newIncomeName, newNominal, linkedIncome.transfer_date, newCreatedBy, linkedIncome.id]
                );

                const updatedTxRes = await client.query(
                    `
                    UPDATE "financeschema"."transactions"
                    SET credit = $1,
                        debit = 0,
                        notes = $2,
                        "createdBy" = $3
                    WHERE "transactionId" = $4
                    RETURNING *;
                    `,
                    [newNominal, `Income: ${newIncomeName}`, newCreatedBy, transactionId]
                );

                await recalculateTransactionBalances(client);

                await client.query('COMMIT');
                return {
                    success: true,
                    statusCode: 200,
                    message: 'Income transaction and linked income updated successfully.',
                    data: updatedTxRes.rows[0],
                };
            }

            const oldDebit = parseFloat(txToUpdate.debit);
            const newNominal = nominal !== undefined ? parseFloat(nominal) : oldDebit;

            const causesInsufficientBalance = await willUpdateTransactionCauseInsufficientBalance(
                client,
                transactionId,
                0,
                newNominal
            );
            if (causesInsufficientBalance) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    statusCode: 400,
                    message: 'Insufficient balance. The updated expense exceeds the available balance at transaction time.'
                };
            }

            const newNotes = notes ?? txToUpdate.notes;
            const newCreatedBy = createdBy ?? txToUpdate.createdBy;

            const updatedTxRes = await client.query(
                `
                UPDATE "financeschema"."transactions"
                SET debit = $1,
                    credit = 0,
                    notes = $2,
                    "createdBy" = $3
                WHERE "transactionId" = $4
                RETURNING *;
                `,
                [newNominal, newNotes, newCreatedBy, transactionId]
            );

            await recalculateTransactionBalances(client);

            await client.query('COMMIT');
            return {
                success: true,
                statusCode: 200,
                message: 'Transaction updated and balance recalculated successfully.',
                data: updatedTxRes.rows[0],
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during update transaction service:', error);
            return {success: false, statusCode: 500, message: 'Server error while updating transaction.'};
        } finally {
            client.release();
        }
    },

    deleteTransaction: async (transactionId) => {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            await lockTransactionLedger(client);

            const txRes = await client.query(
                'SELECT * FROM "financeschema"."transactions" WHERE "transactionId" = $1 FOR UPDATE',
                [transactionId]
            );
            if (txRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return {success: false, statusCode: 404, message: 'Transaction not found.'};
            }
            const txToDelete = txRes.rows[0];

            const creditAmount = parseFloat(txToDelete.credit) || 0;

            if (creditAmount > 0) {
                const willCauseInsufficientBalance = await willDeleteTransactionCauseInsufficientBalance(client, transactionId);

                if (willCauseInsufficientBalance) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        statusCode: 400,
                        message: 'Cannot delete income transaction because the balance is insufficient.'
                    };
                }
            }

            if (creditAmount > 0) {
                await client.query(
                    'DELETE FROM "financeschema"."incomedata" WHERE "transactionId" = $1',
                    [transactionId]
                );
            }

            await client.query('DELETE FROM "financeschema"."transactions" WHERE "transactionId" = $1', [transactionId]);

            await recalculateTransactionBalances(client);

            await client.query('COMMIT');
            return {
                success: true,
                statusCode: 200,
                message: 'Transaction deleted and related data recalculated successfully.'
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