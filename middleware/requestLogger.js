const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    const requestId = req.requestId || 'unknown';
    
    // Log request start
    logger.info('Request started', {
        requestId,
        method: req.method,
        path: req.path,
        userId: req.user?._id || 'anonymous',
        ip: req.ip
    });
    
    // Log request completion
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?._id || 'anonymous',
            ip: req.ip
        });
    });
    
    next();
};

module.exports = requestLogger; 