const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
});

// Input validation middleware
const validateRegistration = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please enter a valid email'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)
        .withMessage('Password must be at least 8 characters long and contain at least one letter and one number')
];

const validateLogin = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Invalid username format'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Invalid password format')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email or username already exists' 
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                subscriptionStatus: user.subscriptionStatus
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Login user
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Fetch latest subscription status from Stripe
        if (user.stripeCustomerId) {
            try {
                const subscriptions = await require('stripe')(process.env.STRIPE_SECRET_KEY).subscriptions.list({
                    customer: user.stripeCustomerId,
                    status: 'active',
                });
                let latestStatus = 'none';
                let latestPlan = 'none';
                if (subscriptions.data.length > 0) {
                    // Assume the first active subscription is the relevant one
                    const sub = subscriptions.data[0];
                    const priceId = sub.items.data[0]?.price?.id;
                    if (priceId === 'price_1RSuKXL6G7tKq6vSssB7jpQM') {
                        latestStatus = 'monthly';
                        latestPlan = 'monthly';
                    } else if (priceId === 'price_1RTZOWL6G7tKq6vSwY0SBVGa') {
                        latestStatus = 'yearly';
                        latestPlan = 'yearly';
                    } else if (priceId === 'price_1RTcUZL6G7tKq6vSUaORxB2E') {
                        latestStatus = 'lifetime';
                        latestPlan = 'lifetime';
                    }
                }
                user.subscriptionStatus = latestStatus;
                user.planType = latestPlan;
                await user.save();
            } catch (stripeErr) {
                // Log but do not block login
                console.error('Error fetching Stripe subscription status:', stripeErr.message);
            }
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                subscriptionStatus: user.subscriptionStatus
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                subscriptionStatus: req.user.subscriptionStatus
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

module.exports = router; 