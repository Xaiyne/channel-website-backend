const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create Stripe customer
router.post('/create-customer', auth, async (req, res) => {
    try {
        const customer = await stripe.customers.create({
            email: req.user.email,
            metadata: {
                userId: req.user._id.toString()
            }
        });

        req.user.stripeCustomerId = customer.id;
        await req.user.save();

        res.json({ customerId: customer.id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating customer' });
    }
});

// Create subscription
router.post('/create-subscription', auth, async (req, res) => {
    try {
        const { paymentMethodId, priceId } = req.body;

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: req.user.stripeCustomerId,
        });

        // Set as default payment method
        await stripe.customers.update(req.user.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: req.user.stripeCustomerId,
            items: [{ price: priceId }],
            expand: ['latest_invoice.payment_intent'],
        });

        // Update user subscription status
        req.user.subscriptionStatus = priceId.includes('premium') ? 'premium' : 'basic';
        req.user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        await req.user.save();

        res.json({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating subscription' });
    }
});

// Cancel subscription
router.post('/cancel-subscription', auth, async (req, res) => {
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: req.user.stripeCustomerId,
            status: 'active',
        });

        if (subscriptions.data.length > 0) {
            await stripe.subscriptions.del(subscriptions.data[0].id);
        }

        // Update user subscription status
        req.user.subscriptionStatus = 'none';
        req.user.subscriptionEndDate = null;
        await req.user.save();

        res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling subscription' });
    }
});

// Get subscription status
router.get('/status', auth, async (req, res) => {
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: req.user.stripeCustomerId,
            status: 'active',
        });

        res.json({
            subscriptionStatus: req.user.subscriptionStatus,
            subscriptionEndDate: req.user.subscriptionEndDate,
            isActive: subscriptions.data.length > 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscription status' });
    }
});

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // Handle the event
        switch (event.type) {
            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                const user = await User.findOne({ 
                    stripeCustomerId: subscription.customer 
                });
                
                if (user) {
                    user.subscriptionStatus = 'none';
                    user.subscriptionEndDate = null;
                    await user.save();
                }
                break;
            
            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                const updatedUser = await User.findOne({ 
                    stripeCustomerId: updatedSubscription.customer 
                });
                
                if (updatedUser) {
                    updatedUser.subscriptionStatus = 
                        updatedSubscription.items.data[0].price.id.includes('premium') 
                            ? 'premium' 
                            : 'basic';
                    updatedUser.subscriptionEndDate = new Date(
                        updatedSubscription.current_period_end * 1000
                    );
                    await updatedUser.save();
                }
                break;
        }

        res.json({ received: true });
    } catch (error) {
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

module.exports = router; 