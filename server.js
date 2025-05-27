require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const securityMiddleware = require('./middleware/security');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Security middleware
securityMiddleware(app);

// Request logging
app.use(requestLogger);

// SSL configuration
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/api.statsflow.online/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/api.statsflow.online/fullchain.pem')
};

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    logger.info('Connected to MongoDB');
    // Start server
    server.listen(3000, () => {
        logger.info('Server running on https://api.statsflow.online:3000');
    });
})
.catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });
    res.status(500).json({ message: 'Internal server error' });
}); 