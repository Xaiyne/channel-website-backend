// Import configuration
import config from './config.js';

// Input validation functions
const validators = {
    username: (value) => {
        // Username: 3-20 characters, alphanumeric and underscores only
        return /^[a-zA-Z0-9_]{3,20}$/.test(value);
    },
    email: (value) => {
        // Standard email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    password: (value) => {
        // Password: minimum 8 characters, at least one number and one letter
        return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value);
    }
};

// Sanitize input
function sanitizeInput(input) {
    return input.replace(/[<>]/g, ''); // Remove potential HTML tags
}

// API endpoints
const API = {
    login: `${config.API_URL}/api/auth/login`,
    register: `${config.API_URL}/api/auth/register`,
    me: `${config.API_URL}/api/auth/me`,
    createCustomer: `${config.API_URL}/api/subscription/create-customer`,
    createSubscription: `${config.API_URL}/api/subscription/create-subscription`,
    getSubscriptionStatus: `${config.API_URL}/api/subscription/status`
};

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = sanitizeInput(document.getElementById('username').value);
        const password = document.getElementById('password').value;

        // Validate username
        if (!validators.username(username)) {
            alert('Invalid username format');
            return;
        }

        try {
            const response = await fetch(API.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } catch (error) {
            alert(error.message);
        }
    });
}

// Handle register form submission
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = sanitizeInput(document.getElementById('reg-username').value);
        const email = sanitizeInput(document.getElementById('reg-email').value);
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        // Validate inputs
        if (!validators.username(username)) {
            alert('Username must be 3-20 characters and contain only letters, numbers, and underscores');
            return;
        }

        if (!validators.email(email)) {
            alert('Please enter a valid email address');
            return;
        }

        if (!validators.password(password)) {
            alert('Password must be at least 8 characters long and contain at least one letter and one number');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        try {
            const response = await fetch(API.register, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } catch (error) {
            alert(error.message);
        }
    });
}

// Handle login/register form switching
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginBox = document.querySelector('.auth-box');
const registerBox = document.getElementById('registerBox');

if (showRegister && showLogin) {
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginBox.classList.add('hidden');
        registerBox.classList.remove('hidden');
    });

    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        registerBox.classList.add('hidden');
        loginBox.classList.remove('hidden');
    });
}

// Handle subscription page
const loginPrompt = document.getElementById('loginPrompt');
const subscriptionOptions = document.getElementById('subscriptionOptions');
const paymentForm = document.getElementById('paymentForm');

if (loginPrompt && subscriptionOptions && paymentForm) {
    // Check if user is logged in
    if (isLoggedIn()) {
        loginPrompt.classList.add('hidden');
        subscriptionOptions.classList.remove('hidden');
    }

    // Handle plan selection
    const planButtons = document.querySelectorAll('[data-plan]');
    planButtons.forEach(button => {
        button.addEventListener('click', function() {
            const plan = this.dataset.plan;
            subscriptionOptions.classList.add('hidden');
            paymentForm.classList.remove('hidden');
            initializeStripe(plan);
        });
    });
}

// Initialize Stripe
function initializeStripe(plan) {
    // Replace with your Stripe publishable key
    const stripe = Stripe('pk_live_51RStkmL6G7tKq6vSxIiNHrQfwWapYLrVafIBibuxzRdMlsN74xi6X5FI4eNUZLO0yusuHfGwfUXWQP0ObPo0wEmT00FdaDSEhM');
    const elements = stripe.elements();

    // Create card element
    const card = elements.create('card');
    card.mount('#card-element');

    // Handle form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const { token, error } = await stripe.createToken(card);

        if (error) {
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = error.message;
        } else {
            // Here you would typically send the token to your backend
            // For demo purposes, we'll just show a success message
            alert('Payment successful! Thank you for subscribing.');
            window.location.href = 'index.html';
        }
    });
}

// Update navigation based on login status
function updateNavigation() {
    const user = JSON.parse(localStorage.getItem('user'));
    const navLinks = document.querySelector('.nav-links');
    
    if (user) {
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
        navLinks.appendChild(logoutLink);
    }
}

// Call updateNavigation when the page loads
document.addEventListener('DOMContentLoaded', updateNavigation); 