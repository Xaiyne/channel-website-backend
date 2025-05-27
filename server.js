require('dotenv').config();
const express = require('express');
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

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error occurred', {
        requestId: req.requestId || 'unknown',
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?._id || 'anonymous'
    });

    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
}); 