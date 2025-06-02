const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const mongoose = require('mongoose');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

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

        const allowedSortFields = ['subscriberCount', 'viewCount', 'createdAt'];
        const allowedSortOrders = ['asc', 'desc'];

        // Sanitize and validate query params
        let {
            minSubscribers,
            maxSubscribers,
            minViews,
            maxViews,
            maxAge,
            sortBy = 'subscriberCount',
            sortOrder = 'desc',
            page = 1
        } = req.query;

        // Only allow numbers for numeric fields
        minSubscribers = minSubscribers && !isNaN(minSubscribers) ? parseInt(minSubscribers) : undefined;
        maxSubscribers = maxSubscribers && !isNaN(maxSubscribers) ? parseInt(maxSubscribers) : undefined;
        minViews = minViews && !isNaN(minViews) ? parseInt(minViews) : undefined;
        maxViews = maxViews && !isNaN(maxViews) ? parseInt(maxViews) : undefined;
        maxAge = maxAge && !isNaN(maxAge) ? parseInt(maxAge) : undefined;
        page = page && !isNaN(page) ? parseInt(page) : 1;

        // Only allow safe sort fields
        if (!allowedSortFields.includes(sortBy)) sortBy = 'subscriberCount';
        if (!allowedSortOrders.includes(sortOrder)) sortOrder = 'desc';

        // Build filter object
        const filter = {};

        // Subscriber count filter
        if (minSubscribers !== undefined || maxSubscribers !== undefined) {
            filter.subscriber_count = {};
            if (minSubscribers !== undefined) filter.subscriber_count.$gte = minSubscribers;
            if (maxSubscribers !== undefined) filter.subscriber_count.$lte = maxSubscribers;
        }

        // View count filter
        if (minViews !== undefined || maxViews !== undefined) {
            filter.channel_views = {};
            if (minViews !== undefined) filter.channel_views.$gte = minViews;
            if (maxViews !== undefined) filter.channel_views.$lte = maxViews;
        }

        // Maximum age filter
        if (maxAge !== undefined) {
            const currentDate = new Date();
            const minDate = new Date(currentDate.getFullYear() - maxAge, currentDate.getMonth(), currentDate.getDate());
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

// Get user's saved channels
router.get('/saved-channels', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's saved channel IDs
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If no saved channels, return empty array
        if (!user.savedChannels || user.savedChannels.length === 0) {
            return res.json({ channels: [] });
        }

        // Get full channel data for each saved channel
        const channels = await Channel.find({
            channel_id: { $in: user.savedChannels }
        });

        res.json({ channels });
    } catch (error) {
        console.error('Error fetching saved channels:', error);
        res.status(500).json({ message: 'Error accessing saved channels data' });
    }
});

// Add a channel to the user's saved channels
router.post('/save-channel', auth, async (req, res) => {
    try {
        const userId = req.user.id;
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

// Remove a channel from user's saved channels
router.delete('/saved-channels/:channelId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { channelId } = req.params;

        if (!channelId) {
            return res.status(400).json({ message: 'Channel ID is required' });
        }

        // Remove channelId from user's savedChannels array
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { savedChannels: channelId } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Channel removed successfully!' });
    } catch (error) {
        console.error('Error removing channel:', error);
        res.status(500).json({ message: 'Error removing channel' });
    }
});

module.exports = router; 