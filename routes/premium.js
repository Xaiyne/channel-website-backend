const express = require('express');
const router = express.Router();
const { auth, verifySubscription } = require('../middleware/auth');
const Channel = require('../models/Channel');

// Apply authentication middleware to all premium routes
router.use(auth);

// Apply subscription verification middleware to all premium routes
router.use(verifySubscription);

// Premium content endpoints
router.get('/filter', async (req, res) => {
    try {
        const {
            minSubscribers,
            maxSubscribers,
            minViews,
            maxViews,
            maxAge,
            language,
            sortBy = 'subscriberCount',
            sortOrder = 'desc',
            page = 1
        } = req.query;

        // Build filter object
        const filter = {};

        // Subscriber count filter
        if (minSubscribers || maxSubscribers) {
            filter.subscriberCount = {};
            if (minSubscribers) filter.subscriberCount.$gte = parseInt(minSubscribers);
            if (maxSubscribers) filter.subscriberCount.$lte = parseInt(maxSubscribers);
        }

        // View count filter
        if (minViews || maxViews) {
            filter.viewCount = {};
            if (minViews) filter.viewCount.$gte = parseInt(minViews);
            if (maxViews) filter.viewCount.$lte = parseInt(maxViews);
        }

        // Maximum age filter
        if (maxAge) {
            const maxAgeInYears = parseInt(maxAge);
            const currentDate = new Date();
            const minDate = new Date(currentDate.getFullYear() - maxAgeInYears, currentDate.getMonth(), currentDate.getDate());
            filter.createdAt = { $gte: minDate };
        }

        // Language filter
        if (language) {
            filter.language = language;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        // Get total count for pagination
        const total = await Channel.countDocuments(filter);

        // Get filtered channels
        const channels = await Channel.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        res.json({
            channels,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Error in filter endpoint:', error);
        res.status(500).json({ message: 'Error accessing filter data' });
    }
});

// Get available languages for filter
router.get('/languages', async (req, res) => {
    try {
        const languages = await Channel.distinct('language');
        res.json(languages);
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({ message: 'Error fetching available languages' });
    }
});

router.get('/trending', async (req, res) => {
    try {
        // Add your trending data logic here
        res.json({ message: 'Access granted to trending data' });
    } catch (error) {
        res.status(500).json({ message: 'Error accessing trending data' });
    }
});

router.get('/saved-channels', async (req, res) => {
    try {
        // Add your saved channels data logic here
        res.json({ message: 'Access granted to saved channels data' });
    } catch (error) {
        res.status(500).json({ message: 'Error accessing saved channels data' });
    }
});

module.exports = router; 