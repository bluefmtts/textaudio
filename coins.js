// ============================================
// COINS & MEMBERSHIP LOGIC WITH RAZORPAY
// ============================================

console.log("💰 Coins System Loading...");

// Razorpay Configuration (FAKE KEY - User ko apna dalna hai)
const RAZORPAY_KEY = "rzp_test_1234567890abcd"; // 👈 User apni key yaha dalega

// ============================================
// INITIALIZE USER IN FIREBASE
// ============================================

async function initializeUserInFirebase(user) {
    if (!user) return;
    
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // New user - create document
            await userRef.set({
                email: user.email,
                displayName: user.displayName || 'User',
                photoURL: user.photoURL || '',
                coins: 0,
                membershipStatus: false,
                membershipExpiry: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("✅ New user created in Firebase");
        }
        
        // Load user data
        await loadUserData(user.uid);
        
    } catch (error) {
        console.error("❌ Error initializing user:", error);
    }
}

// ============================================
// LOAD USER DATA FROM FIREBASE
// ============================================

async function loadUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update localStorage
            localStorage.setItem('userCoins', userData.coins.toString());
            localStorage.setItem('membershipStatus', userData.membershipStatus.toString());
            
            // Check membership expiry
            if (userData.membershipStatus && userData.membershipExpiry) {
                const expiry = userData.membershipExpiry.toDate();
                const now = new Date();
                
                if (now > expiry) {
                    // Membership expired
                    await db.collection('users').doc(userId).update({
                        membershipStatus: false,
                        membershipExpiry: null
                    });
                    localStorage.setItem('membershipStatus', 'false');
                    showToast("⚠️ Your membership has expired");
                }
            }
            
            console.log("✅ User data loaded:", userData);
            return userData;
        }
    } catch (error) {
        console.error("❌ Error loading user data:", error);
    }
}

// ============================================
// GET USER COINS
// ============================================

async function getUserCoins(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data().coins || 0;
        }
        return 0;
    } catch (error) {
        console.error("❌ Error getting coins:", error);
        return 0;
    }
}

// ============================================
// PURCHASE COINS WITH RAZORPAY (FAKE)
// ============================================

async function purchaseCoins(price, coins) {
    if (!window.currentUser) {
        showToast("❌ Please login first");
        return;
    }
    
    try {
        showToast("⏳ Processing payment...");
        
        // FAKE PAYMENT (Testing mode)
        console.warn("⚠️ Using FAKE payment for testing");
        
        // Simulate payment delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Fake success
        await handleCoinPurchaseSuccess({
            razorpay_payment_id: "pay_fake_" + Date.now(),
            razorpay_order_id: "order_fake_" + Date.now(),
            razorpay_signature: "fake_signature"
        }, coins, price);
        
    } catch (error) {
        console.error("❌ Error purchasing coins:", error);
        showToast("❌ Payment failed. Please try again.");
    }
}

// Handle Coin Purchase Success
async function handleCoinPurchaseSuccess(response, coins, price) {
    try {
        const userId = window.currentUser.uid;
        
        // Update user coins in Firebase
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const currentCoins = userDoc.data().coins || 0;
        
        await userRef.update({
            coins: currentCoins + coins,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Save transaction
        await userRef.collection('transactions').add({
            type: 'coin_purchase',
            amount: coins,
            price: price,
            description: `Purchased ${coins} coins`,
            status: 'success',
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update localStorage
        localStorage.setItem('userCoins', (currentCoins + coins).toString());
        
        showToast(`🎉 ${coins} coins added successfully!`);
        
        // Reload membership page if open
        if (document.querySelector('.membership-page') && typeof loadMembershipPage === 'function') {
            loadMembershipPage();
        }
        
    } catch (error) {
        console.error("❌ Error updating coins:", error);
        showToast("❌ Error updating coins. Please contact support.");
    }
}

// ============================================
// PURCHASE MEMBERSHIP (FAKE)
// ============================================

async function purchaseMembership() {
    if (!window.currentUser) {
        showToast("❌ Please login first");
        return;
    }
    
    try {
        showToast("⏳ Processing payment...");
        
        // FAKE PAYMENT
        console.warn("⚠️ Using FAKE payment for testing");
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Fake success
        await handleMembershipPurchaseSuccess({
            razorpay_payment_id: "pay_mem_fake_" + Date.now(),
            razorpay_order_id: "order_mem_fake_" + Date.now(),
            razorpay_signature: "fake_signature"
        }, 29);
        
    } catch (error) {
        console.error("❌ Error purchasing membership:", error);
        showToast("❌ Payment failed. Please try again.");
    }
}

// Handle Membership Purchase Success
async function handleMembershipPurchaseSuccess(response, price) {
    try {
        const userId = window.currentUser.uid;
        
        // Calculate expiry (30 days from now)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        // Update user membership in Firebase
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            membershipStatus: true,
            membershipExpiry: firebase.firestore.Timestamp.fromDate(expiryDate),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Save transaction
        await userRef.collection('transactions').add({
            type: 'membership',
            amount: 0,
            price: price,
            description: 'Premium Membership (30 days)',
            status: 'success',
            expiryDate: firebase.firestore.Timestamp.fromDate(expiryDate),
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update localStorage
        localStorage.setItem('membershipStatus', 'true');
        
        showToast(`🎉 Premium Activated! Valid till ${expiryDate.toLocaleDateString()}`);
        
        // Reload membership page
        if (document.querySelector('.membership-page') && typeof loadMembershipPage === 'function') {
            loadMembershipPage();
        }
        
    } catch (error) {
        console.error("❌ Error activating membership:", error);
        showToast("❌ Error activating membership. Please contact support.");
    }
}

// ============================================
// CANCEL MEMBERSHIP
// ============================================

async function cancelMembership() {
    if (!window.currentUser) {
        showToast("❌ Please login first");
        return;
    }
    
    const confirm = window.confirm('Cancel membership? It will remain active until expiry.');
    
    if (confirm) {
        try {
            const userId = window.currentUser.uid;
            
            await db.collection('users').doc(userId).update({
                autoRenew: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast("✅ Membership will not auto-renew");
            
        } catch (error) {
            console.error("❌ Error cancelling membership:", error);
            showToast("❌ Error cancelling membership");
        }
    }
}

// ============================================
// USE COINS
// ============================================

async function useCoins(amount, description) {
    if (!window.currentUser) {
        showToast("❌ Please login first");
        return false;
    }
    
    try {
        const userId = window.currentUser.uid;
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        const currentCoins = userDoc.data().coins || 0;
        
        if (currentCoins < amount) {
            showToast(`❌ Not enough coins! You need ${amount} coins.`);
            return false;
        }
        
        // Deduct coins
        await userRef.update({
            coins: currentCoins - amount,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Save transaction
        await userRef.collection('transactions').add({
            type: 'coin_usage',
            amount: -amount,
            price: 0,
            description: description,
            status: 'success',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update localStorage
        localStorage.setItem('userCoins', (currentCoins - amount).toString());
        
        showToast(`✅ ${amount} coins used!`);
        
        return true;
        
    } catch (error) {
        console.error("❌ Error using coins:", error);
        showToast("❌ Error using coins");
        return false;
    }
}

// ============================================
// GET TRANSACTION HISTORY
// ============================================

async function getTransactionHistory(userId) {
    try {
        const snapshot = await db.collection('users')
            .doc(userId)
            .collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        
        const transactions = [];
        snapshot.forEach(doc => {
            transactions.push({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            });
        });
        
        return transactions;
        
    } catch (error) {
        console.error("❌ Error getting transactions:", error);
        return [];
    }
}

// ============================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================

window.initializeUserInFirebase = initializeUserInFirebase;
window.loadUserData = loadUserData;
window.getUserCoins = getUserCoins;
window.purchaseCoins = purchaseCoins;
window.purchaseMembership = purchaseMembership;
window.cancelMembership = cancelMembership;
window.useCoins = useCoins;
window.getTransactionHistory = getTransactionHistory;

console.log("✅ Coins system ready! (FAKE payments mode)");
console.log("💡 To enable real payments, add Razorpay key in coins.js");
