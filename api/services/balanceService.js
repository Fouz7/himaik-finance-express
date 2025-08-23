import db from '../config/db.js';
import { put, list } from '@vercel/blob';
import { nanoid } from 'nanoid';

const mapping = global.mapping || (global.mapping = new Map());
const EVIDENCE_PREFIX = 'balance-evidence/';

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

    uploadBalanceEvidence: async (file) => {
        try {
            if (!file || !file.buffer || file.size === 0) {
                return { success: false, statusCode: 400, message: 'No file uploaded or file is empty.' };
            }

            const allowed = ['image/jpeg', 'image/png'];
            if (!allowed.includes(file.mimetype)) {
                return { success: false, statusCode: 400, message: 'Only JPG or PNG are allowed.' };
            }

            const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
            const key = `${EVIDENCE_PREFIX}${Date.now()}-${nanoid(6)}.${ext}`;

            const blob = await put(key, file.buffer, {
                access: 'public',
                contentType: file.mimetype,
                addRandomSuffix: false,
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            // optional: keep a short-lived mapping
            mapping.set(key, blob.url);

            return { success: true, statusCode: 201, data: { url: blob.url, key } };
        } catch (error) {
            console.error('Error uploading balance evidence:', error);
            return { success: false, statusCode: 500, message: 'Server error while uploading evidence.' };
        }
    },

    showBalanceEvidence: async () => {
        try {
            const out = await list({
                prefix: EVIDENCE_PREFIX,
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            const blobs = out?.blobs ?? [];
            if (blobs.length === 0) {
                return { success: true, statusCode: 200, data: { url: null } };
            }

            const latest = blobs.reduce((a, b) =>
                new Date(a.uploadedAt) > new Date(b.uploadedAt) ? a : b
            );

            return { success: true, statusCode: 200, data: { url: latest.url, key: latest.pathname } };
        } catch (error) {
            console.error('Error fetching latest balance evidence:', error);
            return { success: false, statusCode: 500, message: 'Server error while fetching latest evidence.' };
        }
    }
};

export default BalanceService;