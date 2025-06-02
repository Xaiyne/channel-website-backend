const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Check required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('ERROR: STRIPE_SECRET_KEY is not set in environment variables');
    process.exit(1);
}
if (!process.env.FRONTEND_URL) {
    console.error('ERROR: FRONTEND_URL is not set in environment variables');
    process.exit(1);
}

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

        // Update user subscription status and related fields
        let planType = 'none';
        let subscriptionStatus = 'none';
        if (priceId === 'price_1RSuKXL6G7tKq6vSssB7jpQM') {
            planType = 'monthly';
            subscriptionStatus = 'monthly';
        } else if (priceId === 'price_1RTZOWL6G7tKq6vSwY0SBVGa') {
            planType = 'yearly';
            subscriptionStatus = 'yearly';
        } else if (priceId === 'price_1RTcUZL6G7tKq6vSUaORxB2E') {
            planType = 'lifetime';
            subscriptionStatus = 'lifetime';
        }
        req.user.planType = planType;
        req.user.subscriptionStatus = subscriptionStatus;
        req.user.subscriptionStartDate = new Date();
        req.user.lastPaymentDate = new Date();
        req.user.stripeSubscriptionId = subscription.id;
        if (planType === 'lifetime') {
            req.user.subscriptionEndDate = null;
        } else {
            req.user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
        }
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

// Create a Stripe Checkout session
router.post('/create-checkout-session', auth, async (req, res) => {
    try {
        const { plan } = req.body;
        console.log('Creating checkout session for plan:', plan);
        console.log('User from request:', req.user);

        if (!plan) {
            console.error('No plan specified in request');
            return res.status(400).json({ message: 'Plan is required' });
        }

        const user = await User.findById(req.user._id);
        console.log('Found user:', user);

        if (!user) {
            console.log('User not found with ID:', req.user._id);
            return res.status(404).json({ message: 'User not found' });
        }

        // Define price IDs for your plans
        const priceIds = {
            monthly: 'price_1RSuKXL6G7tKq6vSssB7jpQM', // Monthly plan: $19.99/month
            yearly: 'price_1RTZOWL6G7tKq6vSwY0SBVGa', // Yearly plan: $179/year ($15/month)
            lifetime: 'price_1RTcUZL6G7tKq6vSUaORxB2E' // Test product: $1/month
        };

        if (!priceIds[plan]) {
            console.error('Invalid plan specified:', plan);
            return res.status(400).json({ message: 'Invalid plan specified' });
        }

        // Create or get Stripe customer
        let customer;
        if (user.stripeCustomerId) {
            console.log('Using existing Stripe customer:', user.stripeCustomerId);
            customer = user.stripeCustomerId;
        } else {
            console.log('Creating new Stripe customer for user:', user.email);
            const stripeCustomer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user._id.toString()
                }
            });
            customer = stripeCustomer.id;
            user.stripeCustomerId = customer;
            await user.save();
            console.log('Created new Stripe customer:', customer);
        }

        // Create checkout session
        console.log('Creating Stripe checkout session for customer:', customer);
        const session = await stripe.checkout.sessions.create({
            customer: customer,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceIds[plan],
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/subscribe.html`,
            metadata: {
                userId: user._id.toString(),
                plan: plan
            },
            expand: ['line_items'],
        });

        console.log('Created checkout session:', session.id);
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error creating checkout session',
            error: error.message,
            details: error.stack
        });
    }
});

module.exports = router; 