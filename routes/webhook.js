const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

// Stripe webhook endpoint with immediate verification
router.post('/stripe', 
    // First middleware: Handle raw body
    express.raw({ type: 'application/json' }),
    
    // Second middleware: Verify webhook immediately
    async (req, res, next) => {
        const sig = req.headers['stripe-signature'];
        
        logger.info('Verifying Stripe webhook', {
            signature: sig ? 'present' : 'missing',
            contentType: req.headers['content-type'],
            bodyLength: req.rawBody ? req.rawBody.length : 0,
            bodyIsBuffer: Buffer.isBuffer(req.rawBody)
        });

        try {
            // Verify the webhook signature using rawBody
            const event = stripe.webhooks.constructEvent(
                req.rawBody,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
            
            // Attach the verified event to the request object
            req.stripeEvent = event;
            
            logger.info('Stripe webhook verified successfully', {
                type: event.type,
                id: event.id
            });
            
            next();
        } catch (err) {
            logger.error('Stripe webhook verification failed:', {
                message: err.message,
                signature: sig ? 'present' : 'missing',
                bodyLength: req.rawBody ? req.rawBody.length : 0,
                bodyIsBuffer: Buffer.isBuffer(req.rawBody)
            });
            
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    },
    
    // Final handler: Process the verified event
    async (req, res) => {
        const event = req.stripeEvent;
        
        logger.info('Processing verified webhook event', {
            type: event.type,
            id: event.id
        });

        // TODO: Handle the verified event
        res.json({received: true});
    }
);

module.exports = router; 