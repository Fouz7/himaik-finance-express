import AuthService from '../services/authService.js';

const AuthController = {
    login: async (req, res) => {
        if (!req.body) {
            return res.status(400).json({message: 'Request body is missing or malformed.'});
        }

        const {username, password} = req.body;

        const result = await AuthService.login(username, password);

        if (!result.success) {
            return res.status(result.statusCode).json({message: result.message});
        }

        res.status(result.statusCode).json({message: result.message, data: result.data});
    },
};

export default AuthController;