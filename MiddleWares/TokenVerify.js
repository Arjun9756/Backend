const jwt = require('jsonwebtoken')

const TokenVerify = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            return res.status(401).json({
                message: "No token provided",
                status: false
            });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                message: "Invalid token format",
                status: false
            });
        }

        const tokenData = jwt.verify(token, process.env.JWT_SECRET);
        req.user = tokenData;
        next();
        
    } catch (error) {
        return res.status(401).json({
            message: "Invalid token",
            error: error.message,
            status: false
        });
    }
}

module.exports = TokenVerify