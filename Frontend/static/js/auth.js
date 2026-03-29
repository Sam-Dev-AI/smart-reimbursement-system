// Auth UI Logic
const authCard = document.getElementById('auth-card');
const toSignup = document.getElementById('to-signup');
const toLogin = document.getElementById('to-login');
const countrySelect = document.getElementById('signup-country');

// Flip to Signup
toSignup.addEventListener('click', (e) => {
    e.preventDefault();
    authCard.classList.add('flipped');
});

// Flip to Login
toLogin.addEventListener('click', (e) => {
    e.preventDefault();
    authCard.classList.remove('flipped');
});

// Load Countries dynamically on boot
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/countries');
        const countries = await response.json();
        
        countrySelect.innerHTML = '<option value="">Select Country...</option>';
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.name;
            // Store currency info in dataset for easy retrieval
            option.dataset.currency = country.currency_code;
            option.textContent = `${country.name} (${country.currency_code})`;
            countrySelect.appendChild(option);
        });
    } catch (e) {
        console.error("Error loading countries:", e);
    }
});

/**
 * FIREBASE CLIENT CONFIGURATION
 * Updated with user's project configuration.
 */
const firebaseConfig = {
    apiKey: "Your_API_Key",
    authDomain: "Your_Auth_Domain",
    projectId: "Your_Project_ID",
    storageBucket: "Your_Storage_Bucket",
    messagingSenderId: "Your_Messaging_Sender_ID",
    appId: "Your_App_ID",
    measurementId: "Your_Measurement_ID"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Handle Login
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const idToken = await userCredential.user.getIdToken();
        
        // Notify Backend to set session and get redirect
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            window.location.href = data.redirect;
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        alert(error.message);
    }
});

// Handle Signup
const signupForm = document.getElementById('signup-form');
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const companyName = document.getElementById('signup-company').value;
    const country = countrySelect.value;
    const currency = countrySelect.options[countrySelect.selectedIndex].dataset.currency;
    const pass = document.getElementById('signup-pass').value;
    const confirmPass = document.getElementById('signup-confirm').value;

    if (pass !== confirmPass) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const idToken = await userCredential.user.getIdToken();
        
        // Notify Backend to associate UID with Role/Company/Country
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idToken,
                fullName,
                email,
                companyName,
                country,
                currency
            })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            window.location.href = data.redirect;
        } else {
            alert("Backend Signup Error: " + data.message);
        }
    } catch (error) {
        alert("Firebase Signup Error: " + error.message);
    }
});
