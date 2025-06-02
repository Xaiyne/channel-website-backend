const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const mongoose = require('mongoose');
const User = require('../models/User');

// Constants for limits
const MAX_RESULTS_PER_PAGE = 20;
const MAX_TOTAL_RESULTS = 50;  // Hard limit on total results

// Premium content endpoints
router.get('/filter', async (req, res) => {
    try {
        // Log database connection details
        console.log('MongoDB Connection Details:');
        console.log('Database Name:', mongoose.connection.name);
        console.log('Database Host:', mongoose.connection.host);
        console.log('Connection State:', mongoose.connection.readyState);
        
        // List all collections in the database
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // Get a sample document to check field formats
        const sampleDoc = await Channel.findOne({});
        if (sampleDoc) {
            console.log('Sample document structure:', JSON.stringify(sampleDoc.toObject(), null, 2));
        }

        // Verify we're using the correct collection
        if (Channel.collection.name !== 'channel_data_new') {
            console.error('Wrong collection! Expected channel_data_new, got:', Channel.collection.name);
            return res.status(500).json({ message: 'Database configuration error' });
        }

        // Get total count of documents in the collection
        const totalDocs = await Channel.countDocuments({});
        console.log('Total documents in collection:', totalDocs);

        console.log('Using collection:', Channel.collection.name);
        console.log('Filter endpoint called with query:', req.query);

        const {
            minSubscribers,
            maxSubscribers,
            minViews,
            maxViews,
            maxAge,
            sortBy = 'subscriber_count',
            sortOrder = 'desc',
            page = 1
        } = req.query;

        // Build filter object
        const filter = {};

        // Subscriber count filter
        if (minSubscribers || maxSubscribers) {
            filter.subscriber_count = {};
            if (minSubscribers) filter.subscriber_count.$gte = parseInt(minSubscribers);
            if (maxSubscribers) filter.subscriber_count.$lte = parseInt(maxSubscribers);
        }

        // View count filter
        if (minViews || maxViews) {
            filter.channel_views = {};
            if (minViews) filter.channel_views.$gte = parseInt(minViews);
            if (maxViews) filter.channel_views.$lte = parseInt(maxViews);
        }

        // Maximum age filter
        if (maxAge) {
            const maxAgeInYears = parseInt(maxAge);
            const currentDate = new Date();
            const minDate = new Date(currentDate.getFullYear() - maxAgeInYears, currentDate.getMonth(), currentDate.getDate());
            console.log('Calculated minDate:', minDate);
            filter.channel_creation_date = { $gte: minDate };
        }

        console.log('MongoDB filter:', JSON.stringify(filter, null, 2));

        // Map frontend sort fields to database fields
        const sortFieldMap = {
            'subscriberCount': 'subscriber_count',
            'viewCount': 'channel_views',
            'createdAt': 'channel_creation_date'
        };

        // Build sort object
        const sort = {};
        const dbSortField = sortFieldMap[sortBy] || 'subscriber_count';
        sort[dbSortField] = sortOrder === 'desc' ? -1 : 1;
        console.log('Sort configuration:', sort);

        // First, get the total count of matching documents (no limit)
        const totalMatching = await Channel.countDocuments(filter);
        console.log('Total matching documents (before limit):', totalMatching);

        // Calculate pagination with hard limits
        const limit = Math.min(MAX_RESULTS_PER_PAGE, parseInt(req.query.limit) || MAX_RESULTS_PER_PAGE);
        const pageNum = Math.min(Math.max(1, parseInt(page)), Math.ceil(MAX_TOTAL_RESULTS / limit));
        const skip = (pageNum - 1) * limit;

        // Get filtered channels with hard limit
        const channels = await Channel.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        console.log('Found channels:', channels.length);
        if (channels.length > 0) {
            console.log('Sample channel:', {
                channel_id: channels[0].channel_id,
                subscriber_count: channels[0].subscriber_count,
                channel_views: channels[0].channel_views,
                channel_creation_date: channels[0].channel_creation_date
            });
        }

        // Calculate the total to return (capped at MAX_TOTAL_RESULTS)
        const total = Math.min(totalMatching, MAX_TOTAL_RESULTS);

        res.json({
            channels,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limit),
                limit,
                hasMore: totalMatching > MAX_TOTAL_RESULTS,
                totalMatching // Include the actual total for reference
            }
        });
    } catch (error) {
        console.error('Error in filter endpoint:', error);
        res.status(500).json({ message: 'Error accessing filter data' });
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

// Add a channel to the user's saved channels
router.post('/save-channel', async (req, res) => {
    try {
        // Assume authentication middleware sets req.user.id
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { channelId } = req.body;
        if (!channelId) {
            return res.status(400).json({ message: 'Channel ID is required' });
        }
        // Check if the channel exists
        const channel = await Channel.findOne({ channel_id: channelId });
        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }
        // Add channelId to user's savedChannels array if not already present
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { savedChannels: channelId } },
            { new: true }
        );
        res.json({ message: 'Channel saved successfully!' });
    } catch (error) {
        console.error('Error saving channel:', error);
        res.status(500).json({ message: 'Error saving channel' });
    }
});

module.exports = router; 