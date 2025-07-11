import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const AuthService = {
    login: async (username, password) => {
        if (!username || !password) {
            return {success: false, statusCode: 400, message: 'Username and password are required.'};
        }

        try {
            const query = 'SELECT * FROM "financeschema"."users" WHERE username = $1;';
            const {rows} = await db.query(query, [username]);
            const user = rows[0];

            if (!user) {
                return {success: false, statusCode: 401, message: 'Invalid credentials.'};
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return {success: false, statusCode: 401, message: 'Invalid credentials.'};
            }

            delete user.password;

            const payload = {
                id: user.id,
                username: user.username,
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '7d',
            });

            return {
                success: true,
                statusCode: 200,
                message: 'Login successful',
                data: {user, token},
            };

        } catch (error) {
            console.error('Error during login service:', error);
            return {success: false, statusCode: 500, message: 'Server error during login.'};
        }
    },
};

export default AuthService;