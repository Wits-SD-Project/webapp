const { admin } = require("./firebase");

const authenticate = async (req, res, next) => {
    const token = req.cookies?.authToken || 
                 req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            message: 'Authentication required',
            errorCode: 'MISSING_AUTH_TOKEN'
        });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            role: decodedToken.role || 'user' // Assuming you set custom claims
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });

        return res.status(401).json({ 
            message: 'Invalid or expired token',
            errorCode: 'INVALID_AUTH_TOKEN'
        });
    }
};

module.exports = authenticate;