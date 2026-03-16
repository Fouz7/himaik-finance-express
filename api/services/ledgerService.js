const lockTransactionLedger = async (client) => {
    await client.query(
        `
        SELECT "transactionId"
        FROM "financeschema"."transactions"
        ORDER BY "createdAt", "transactionId"
        FOR UPDATE;
        `
    );
};

const recalculateTransactionBalances = async (client) => {
    await client.query(
        `
        WITH ordered AS (
            SELECT
                "transactionId",
                SUM((COALESCE(credit, 0) - COALESCE(debit, 0))) OVER (
                    ORDER BY "createdAt", "transactionId"
                ) AS recalculated_balance
            FROM "financeschema"."transactions"
        )
        UPDATE "financeschema"."transactions" AS t
        SET balance = ordered.recalculated_balance
        FROM ordered
        WHERE t."transactionId" = ordered."transactionId";
        `
    );
};

const willDeleteTransactionCauseInsufficientBalance = async (client, transactionId) => {
    const result = await client.query(
        `
        WITH remaining AS (
            SELECT
                SUM((COALESCE(credit, 0) - COALESCE(debit, 0))) OVER (
                    ORDER BY "createdAt", "transactionId"
                ) AS running_balance
            FROM "financeschema"."transactions"
            WHERE "transactionId" <> $1
        )
        SELECT COALESCE(MIN(running_balance), 0) AS "minBalance"
        FROM remaining;
        `,
        [transactionId]
    );

    return parseFloat(result.rows[0].minBalance) < 0;
};

const willUpdateTransactionCauseInsufficientBalance = async (client, transactionId, nextCredit, nextDebit) => {
    const result = await client.query(
        `
        WITH adjusted AS (
            SELECT
                "transactionId",
                "createdAt",
                CASE WHEN "transactionId" = $1 THEN $2 ELSE COALESCE(credit, 0) END AS credit,
                CASE WHEN "transactionId" = $1 THEN $3 ELSE COALESCE(debit, 0) END AS debit
            FROM "financeschema"."transactions"
        ),
        running AS (
            SELECT
                SUM((credit - debit)) OVER (
                    ORDER BY "createdAt", "transactionId"
                ) AS running_balance
            FROM adjusted
        )
        SELECT COALESCE(MIN(running_balance), 0) AS "minBalance"
        FROM running;
        `,
        [transactionId, nextCredit, nextDebit]
    );

    return parseFloat(result.rows[0].minBalance) < 0;
};

export {
    lockTransactionLedger,
    recalculateTransactionBalances,
    willDeleteTransactionCauseInsufficientBalance,
    willUpdateTransactionCauseInsufficientBalance,
};

