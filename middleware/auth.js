const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Simple subscription check middleware
const verifySubscription = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const validSubscriptions = ['monthly', 'yearly', 'lifetime'];
        if (!validSubscriptions.includes(req.user.subscriptionStatus)) {
            return res.status(403).json({ message: 'Subscription required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { auth, verifySubscription }; 