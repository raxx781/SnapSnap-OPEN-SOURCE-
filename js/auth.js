// SnapSnap Authentication

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const authError = document.getElementById('auth-error');

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    authError.classList.remove('visible');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
    authError.classList.remove('visible');
});

function showError(msg) {
    authError.textContent = msg;
    authError.classList.add('visible');
}

// If already logged in, redirect to app
auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'app.html';
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = loginForm.querySelector('button');
    btn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'app.html';
    } catch (err) {
        showError(err.message);
        btn.disabled = false;
    }
});

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const btn = signupForm.querySelector('button');
    btn.disabled = true;

    try {
        // Check if username is already taken
        const existing = await db.collection('users').where('username', '==', username).get();
        if (!existing.empty) {
            showError('Username is already taken.');
            btn.disabled = false;
            return;
        }

        const cred = await auth.createUserWithEmailAndPassword(email, password);

        // Random avatar color
        const colors = ['#5865f2', '#eb459e', '#fee75c', '#57f287', '#ed4245', '#f47b67', '#e8a62b', '#45ddc0'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];

        // Create user document in Firestore
        await db.collection('users').doc(cred.user.uid).set({
            username: username,
            email: email,
            avatarColor: avatarColor,
            friends: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.location.href = 'app.html';
    } catch (err) {
        showError(err.message);
        btn.disabled = false;
    }
});
