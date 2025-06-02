const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    channel_id: {
        type: String,
        required: true,
        unique: true
    },
    channel_name: {
        type: String,
        required: true
    },
    channel_url: {
        type: String,
        required: true
    },
    channel_image_url: {
        type: String,
        required: true
    },
    subscriber_count: {
        type: Number,
        required: true
    },
    channel_views: {
        type: Number,
        required: true
    },
    channel_videos: {
        type: Number,
        required: true
    },
    channel_country: {
        type: String,
        required: true
    },
    channel_creation_date: {
        type: Date,
        required: true
    },
    data_retrieved_at: {
        type: Date,
        required: true
    }
}, {
    timestamps: true,
    collection: 'channel_data_new'
});

module.exports = mongoose.model('Channel', channelSchema); 