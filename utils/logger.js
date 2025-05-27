const winston = require('winston');
require('winston-daily-rotate-file');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create rotating file transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '20m', // Rotate when file reaches 20MB
    zippedArchive: true, // Compress rotated files
    format: logFormat
});

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        // Write all logs to rotating file
        fileRotateTransport,
        // Also log to console in development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Create a stream object for Morgan
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger; 