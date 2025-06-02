const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const mongoose = require('mongoose');

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

        // Try a simpler filter first to verify data exists
        const simpleFilter = await Channel.find({}).limit(1);
        console.log('Simple filter result:', simpleFilter.length > 0 ? 'Found documents' : 'No documents');

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        // Get total count for pagination
        const total = await Channel.countDocuments(filter);
        console.log('Total matching documents:', total);

        // Get filtered channels
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