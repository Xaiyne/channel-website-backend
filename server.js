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
const webhookRoutes = require('./routes/webhook');

const app = express();

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data:; connect-src 'self' https: wss:;");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Middleware
app.use(cors({
    origin: ['https://statsflow.online', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));

// Security middleware
securityMiddleware(app);

// Request logging
app.use(requestLogger);

// SSL configuration
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/api.statsflow.online/privkey.pem'),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/api.statsflow.online/fullchain.pem')
    };
} catch (error) {
    logger.error('Error loading SSL certificates:', error);
    process.exit(1);
}

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
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
        logger.info(`Server running on https://api.statsflow.online:${port}`);
    });
})
.catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/webhook', webhookRoutes);

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