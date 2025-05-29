const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');

// Stripe webhook endpoint - note: no /stripe in path since it's in the base route
router.post('', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    logger.info('Webhook request details:', {
        signature: sig ? 'present' : 'missing',
        signatureValue: sig,
        contentType: req.headers['content-type'],
        bodyExists: !!req.body,
        bodyLength: req.body ? req.body.length : 0,
        bodyIsBuffer: Buffer.isBuffer(req.body),
        headers: req.headers,
        method: req.method,
        url: req.originalUrl
    });

    try {
        // Verify the webhook signature
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        logger.info('Stripe webhook verified successfully', {
            type: event.type,
            id: event.id
        });

        // TODO: Handle the verified event
        res.json({received: true});
    } catch (err) {
        logger.error('Stripe webhook verification failed:', {
            message: err.message,
            signature: sig ? 'present' : 'missing',
            signatureValue: sig,
            bodyLength: req.body ? req.body.length : 0,
            bodyIsBuffer: Buffer.isBuffer(req.body),
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'missing'
        });
        
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

module.exports = router; 