const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const hpp = require('hpp');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply security middleware
const securityMiddleware = (app) => {
    // Set security HTTP headers
    app.use(helmet());

    // Rate limiting
    app.use('/api/', limiter);

    // Data sanitization against XSS
    app.use(xss());

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // Prevent parameter pollution
    app.use(hpp());

    // Enable CORS
    const allowedOrigins = [
        'https://statsflow.online',
        'https://api.statsflow.online:443',
        'http://localhost:443' // For development
    ];
    app.use(cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
        credentials: true,
        maxAge: 86400 // 24 hours
    }));
};

module.exports = securityMiddleware; 