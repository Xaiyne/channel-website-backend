const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    subscriberCount: {
        type: Number,
        required: true
    },
    viewCount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    lastUpdated: {
        type: Date,
        required: true
    }
}, {
    timestamps: true,
    collection: 'channel_data_new'
});

module.exports = mongoose.model('Channel', channelSchema); 