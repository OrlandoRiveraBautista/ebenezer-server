const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config();
module.exports = async (req, res, next) => {
    try {
        const token = req.cookies.token || ' ';

        if ( !token ) {
            return res.status(401).json({
                message: 'You need to Login'
            });
        }
        const decodedToken = await jwt.verify(token, process.env.JWT_KEY);
        console.log(decodedToken)
        req.userData = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Auth Failed'
        });
    }
};