const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const logger = require('../utils/logger');

// Stripe webhook endpoint
router.post('/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    logger.info('Received webhook request', {
        signature: sig ? 'present' : 'missing',
        contentType: req.headers['content-type'],
        bodyType: typeof req.body,
        bodyLength: req.body ? req.body.length : 0
    });

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        logger.info('Successfully constructed webhook event', {
            type: event.type,
            id: event.id
        });
    } catch (err) {
        logger.error('Webhook Error:', {
            message: err.message,
            signature: sig ? 'present' : 'missing',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'missing'
        });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object;
                await handleSubscriptionChange(subscription);
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                await handleSubscriptionDeletion(deletedSubscription);
                break;

            case 'customer.subscription.trial_will_end':
                const trialEndingSubscription = event.data.object;
                await handleTrialEnding(trialEndingSubscription);
                break;

            case 'invoice.payment_succeeded':
                const successfulInvoice = event.data.object;
                await handleSuccessfulPayment(successfulInvoice);
                break;

            case 'invoice.payment_failed':
                const failedInvoice = event.data.object;
                await handlePaymentFailure(failedInvoice);
                break;

            case 'invoice.upcoming':
                const upcomingInvoice = event.data.object;
                await handleUpcomingPayment(upcomingInvoice);
                break;

            default:
                logger.info(`Unhandled event type ${event.type}`);
        }

        res.json({received: true});
    } catch (error) {
        logger.error('Error processing webhook event:', {
            type: event.type,
            error: error.message
        });
        res.status(500).json({error: 'Internal server error'});
    }
});

async function handleSubscriptionChange(subscription) {
    try {
        const user = await User.findOne({ stripeCustomerId: subscription.customer });
        if (!user) return;

        user.subscriptionStatus = subscription.status === 'active' ? 
            (subscription.items.data[0].price.nickname || 'basic') : 'none';
        user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        await user.save();
    } catch (error) {
        console.error('Error handling subscription change:', error);
    }
}

async function handleSubscriptionDeletion(subscription) {
    try {
        const user = await User.findOne({ stripeCustomerId: subscription.customer });
        if (!user) return;

        user.subscriptionStatus = 'none';
        user.subscriptionEndDate = null;
        await user.save();
    } catch (error) {
        console.error('Error handling subscription deletion:', error);
    }
}

async function handleTrialEnding(subscription) {
    try {
        const user = await User.findOne({ stripeCustomerId: subscription.customer });
        if (!user) return;

        // You might want to send an email notification here
        console.log(`Trial ending soon for user ${user.username}`);
    } catch (error) {
        console.error('Error handling trial ending:', error);
    }
}

async function handleSuccessfulPayment(invoice) {
    try {
        const user = await User.findOne({ stripeCustomerId: invoice.customer });
        if (!user) return;

        // Update subscription end date
        user.subscriptionEndDate = new Date(invoice.period_end * 1000);
        await user.save();
    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

async function handlePaymentFailure(invoice) {
    try {
        const user = await User.findOne({ stripeCustomerId: invoice.customer });
        if (!user) return;

        // You might want to notify the user here
        console.log(`Payment failed for user ${user.username}`);
    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

async function handleUpcomingPayment(invoice) {
    try {
        const user = await User.findOne({ stripeCustomerId: invoice.customer });
        if (!user) return;

        // You might want to send a payment reminder email here
        console.log(`Upcoming payment for user ${user.username}`);
    } catch (error) {
        console.error('Error handling upcoming payment:', error);
    }
}

module.exports = router; 