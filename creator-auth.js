// ============================================
// DREAMFM - CREATOR AUTHENTICATION SYSTEM
// ============================================

console.log('🎨 Creator Auth System Loading...');

let currentCreator = null;

// ============================================
// CREATOR AUTH STATE LISTENER
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check if user is a creator
        const creatorDoc = await db.collection('creators').doc(user.uid).get();
        
        if (creatorDoc.exists) {
            currentCreator = {
                uid: user.uid,
                email: user.email,
                ...creatorDoc.data()
            };
            
            console.log('✅ Creator logged in:', currentCreator.channelName);
            window.currentCreator = currentCreator;
            
            // Update last login
            await db.collection('creators').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        } else {
            console.log('⚠️ User is not a creator');
            currentCreator = null;
            window.currentCreator = null;
        }
    } else {
        console.log('❌ No user logged in');
        currentCreator = null;
        window.currentCreator = null;
    }
});

// ============================================
// CREATOR REGISTRATION
// ============================================

async function registerCreator(creatorData) {
    try {
        console.log('📝 Registering creator:', creatorData.email);
        
        // Create Firebase Auth account
        const userCredential = await auth.createUserWithEmailAndPassword(
            creatorData.email,
            creatorData.password
        );
        
        const uid = userCredential.user.uid;
        
        // Create creator profile in Firestore
        await db.collection('creators').doc(uid).set({
            name: creatorData.name,
            email: creatorData.email,
            channelName: creatorData.channelName,
            youtubeUrl: creatorData.youtubeUrl || '',
            description: creatorData.description || '',
            profileImage: creatorData.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(creatorData.channelName) + '&background=ab47bc&color=fff&size=200',
            coverImage: creatorData.coverImage || '',
            
            // Stats
            totalAudiobooks: 0,
            totalSubscribers: 0,
            totalRevenue: 0,
            rating: 0,
            
            // Status
            isApproved: false, // Admin approval required
            isActive: true,
            
            // Bank details (empty initially)
            bankDetails: {
                accountNumber: '',
                ifscCode: '',
                accountHolderName: '',
                upiId: ''
            },
            
            // Timestamps
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Creator registered successfully!');
        
        return {
            success: true,
            uid: uid,
            message: 'Registration successful! Waiting for admin approval.'
        };
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already registered!';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters!';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address!';
        }
        
        return {
            success: false,
            message: errorMessage
        };
    }
}

// ============================================
// CREATOR LOGIN
// ============================================

async function loginCreator(email, password) {
    try {
        console.log('🔐 Logging in creator:', email);
        
        // Sign in with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Check if user is a creator
        const creatorDoc = await db.collection('creators').doc(uid).get();
        
        if (!creatorDoc.exists) {
            // Not a creator account
            await auth.signOut();
            return {
                success: false,
                message: 'This email is not registered as a creator!'
            };
        }
        
        const creatorData = creatorDoc.data();
        
        // Check if approved
        if (!creatorData.isApproved) {
            await auth.signOut();
            return {
                success: false,
                message: 'Your account is pending admin approval. Please wait.'
            };
        }
        
        // Check if active
        if (!creatorData.isActive) {
            await auth.signOut();
            return {
                success: false,
                message: 'Your account has been deactivated. Contact support.'
            };
        }
        
        console.log('✅ Creator login successful:', creatorData.channelName);
        
        currentCreator = {
            uid: uid,
            email: email,
            ...creatorData
        };
        
        window.currentCreator = currentCreator;
        
        return {
            success: true,
            uid: uid,
            creator: currentCreator
        };
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email!';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password!';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address!';
        }
        
        return {
            success: false,
            message: errorMessage
        };
    }
}

// ============================================
// CREATOR LOGOUT
// ============================================

async function logoutCreator() {
    try {
        await auth.signOut();
        currentCreator = null;
        window.currentCreator = null;
        localStorage.clear();
        console.log('✅ Creator logged out');
        return { success: true };
    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// GET CREATOR PROFILE
// ============================================

async function getCreatorProfile(creatorId) {
    try {
        const creatorDoc = await db.collection('creators').doc(creatorId).get();
        
        if (!creatorDoc.exists) {
            return null;
        }
        
        return {
            uid: creatorId,
            ...creatorDoc.data()
        };
        
    } catch (error) {
        console.error('❌ Error fetching creator:', error);
        return null;
    }
}

// ============================================
// UPDATE CREATOR PROFILE
// ============================================

async function updateCreatorProfile(creatorId, updateData) {
    try {
        await db.collection('creators').doc(creatorId).update({
            ...updateData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Creator profile updated');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Update error:', error);
        return { success: false, message: error.message };
    }
}

// ============================================
// GET ALL APPROVED CREATORS
// ============================================

async function getAllCreators(filters = {}) {
    try {
        let query = db.collection('creators')
            .where('isApproved', '==', true)
            .where('isActive', '==', true);
        
        // Add sorting
        if (filters.sortBy === 'subscribers') {
            query = query.orderBy('totalSubscribers', 'desc');
        } else if (filters.sortBy === 'audiobooks') {
            query = query.orderBy('totalAudiobooks', 'desc');
        } else if (filters.sortBy === 'rating') {
            query = query.orderBy('rating', 'desc');
        } else {
            query = query.orderBy('createdAt', 'desc');
        }
        
        const snapshot = await query.get();
        
        const creators = [];
        snapshot.forEach(doc => {
            creators.push({
                uid: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Loaded ${creators.length} creators`);
        return creators;
        
    } catch (error) {
        console.error('❌ Error loading creators:', error);
        return [];
    }
}

// ============================================
// SEARCH CREATORS
// ============================================

async function searchCreators(searchTerm) {
    try {
        const allCreators = await getAllCreators();
        
        if (!searchTerm || searchTerm.trim() === '') {
            return allCreators;
        }
        
        const term = searchTerm.toLowerCase();
        
        const filtered = allCreators.filter(creator => {
            return (
                creator.channelName.toLowerCase().includes(term) ||
                creator.name.toLowerCase().includes(term) ||
                (creator.description && creator.description.toLowerCase().includes(term))
            );
        });
        
        return filtered;
        
    } catch (error) {
        console.error('❌ Search error:', error);
        return [];
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.registerCreator = registerCreator;
window.loginCreator = loginCreator;
window.logoutCreator = logoutCreator;
window.getCreatorProfile = getCreatorProfile;
window.updateCreatorProfile = updateCreatorProfile;
window.getAllCreators = getAllCreators;
window.searchCreators = searchCreators;

console.log('✅ Creator Auth System Ready!');
