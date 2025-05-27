const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by id
        const user = await User.findOne({ 
            _id: decoded.userId,
            // Optional: Add token to user model to invalidate tokens on logout
            // 'tokens.token': token
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Add user to request object
        req.user = user;
        req.token = token;
        
        // Add request ID for tracking
        req.requestId = `${user._id}-${Date.now()}`;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = auth; 