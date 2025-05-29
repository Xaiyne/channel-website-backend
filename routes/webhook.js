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

    let event;

    try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        logger.info('Stripe webhook verified successfully', {
            type: event.type,
            id: event.id
        });

        // Define permitted events
        const permittedEvents = [
            'checkout.session.completed',
            'payment_intent.succeeded',
            'payment_intent.payment_failed'
        ];

        if (permittedEvents.includes(event.type)) {
            let data;

            try {
                switch (event.type) {
                    case 'checkout.session.completed':
                        data = event.data.object;
                        logger.info('Checkout session completed', {
                            sessionId: data.id,
                            paymentStatus: data.payment_status,
                            customerId: data.customer
                        });
                        // TODO: Update user subscription status
                        break;

                    case 'payment_intent.succeeded':
                        data = event.data.object;
                        logger.info('Payment succeeded', {
                            paymentIntentId: data.id,
                            status: data.status,
                            amount: data.amount
                        });
                        break;

                    case 'payment_intent.payment_failed':
                        data = event.data.object;
                        logger.error('Payment failed', {
                            paymentIntentId: data.id,
                            error: data.last_payment_error?.message
                        });
                        break;

                    default:
                        throw new Error(`Unhandled event: ${event.type}`);
                }
            } catch (error) {
                logger.error('Error handling webhook event:', {
                    error: error.message,
                    eventType: event.type
                });
                return res.status(500).json({ message: 'Webhook handler failed' });
            }
        }

        // Return a response to acknowledge receipt of the event
        res.json({ received: true });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Stripe webhook verification failed:', {
            message: errorMessage,
            signature: sig ? 'present' : 'missing',
            signatureValue: sig,
            bodyLength: req.body ? req.body.length : 0,
            bodyIsBuffer: Buffer.isBuffer(req.body),
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'missing'
        });
        
        return res.status(400).json({ message: `Webhook Error: ${errorMessage}` });
    }
});

module.exports = router; 