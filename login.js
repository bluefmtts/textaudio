// ============================================
// DREAMFM LOGIN SYSTEM
// ============================================

console.log("🔐 Login System Loaded");

// Check if user already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("✅ User already logged in:", user.email);
        // Redirect to main website
        window.location.href = 'index.html';
    }
});

// Google Login
document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    showLoading();
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        console.log("✅ Google login success:", result.user.email);
        
        // Create user document in Firestore
        await createUserDocument(result.user);
        
        // Redirect to main website
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error("❌ Google login error:", error);
        alert("Login failed: " + error.message);
    }
});

// Email Login
document.getElementById('emailLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        
        console.log("✅ Email login success:", result.user.email);
        
        // Redirect to main website
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error("❌ Email login error:", error);
        
        // User-friendly error messages
        let errorMessage = "Login failed. Please try again.";
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = "No account found with this email. Please sign up first.";
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = "Incorrect password. Please try again.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email address.";
        }
        
        alert(errorMessage);
    }
});

// Toggle Password Visibility
document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('passwordInput');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
});

// Show Signup (redirect to signup page or show signup form)
document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    
    // Simple signup with email
    const email = prompt("Enter your email address:");
    const password = prompt("Create a password (min 6 characters):");
    
    if (email && password) {
        if (password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }
        
        showLoading();
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((result) => {
                console.log("✅ Account created:", result.user.email);
                createUserDocument(result.user);
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            })
            .catch((error) => {
                hideLoading();
                console.error("❌ Signup error:", error);
                
                let errorMessage = "Signup failed. Please try again.";
                
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "This email is already registered. Please login instead.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Invalid email address.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "Password is too weak. Use at least 6 characters.";
                }
                
                alert(errorMessage);
            });
    }
});

// Create User Document in Firestore
async function createUserDocument(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                favorites: [],
                listeningHistory: [],
                isPremium: false,
                totalListenTime: 0
            });
            
            console.log("✅ User document created in Firestore");
        } else {
            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("❌ Error creating user document:", error);
    }
}

// Show/Hide Loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}