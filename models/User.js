const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    stripeCustomerId: {
        type: String
    },
    stripeSubscriptionId: {
        type: String,
        default: null
    },
    subscriptionStatus: {
        type: String,
        enum: ['none', 'monthly', 'yearly', 'lifetime'],
        default: 'none'
    },
    planType: {
        type: String,
        enum: ['none', 'monthly', 'yearly', 'lifetime'],
        default: 'none'
    },
    subscriptionStartDate: {
        type: Date,
        default: null
    },
    subscriptionEndDate: {
        type: Date
    },
    lastPaymentDate: {
        type: Date,
        default: null
    },
    savedChannels: [{
        type: String
    }]
}, {
    timestamps: true,
    collection: 'users'  // Explicitly set collection name to 'users'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 