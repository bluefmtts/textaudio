// ============================================
// DREAMFM - MAIN APP LOGIC
// ============================================

console.log("🚀 DreamFM App Starting...");

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM Loaded");
    setupEventListeners();
    loadHomePage();
    initializeUserData();
});

// User Data Storage (LocalStorage)
function initializeUserData() {
    if (!localStorage.getItem('likedBooks')) {
        localStorage.setItem('likedBooks', JSON.stringify([]));
    }
    if (!localStorage.getItem('historyBooks')) {
        localStorage.setItem('historyBooks', JSON.stringify([]));
    }
    if (!localStorage.getItem('userCoins')) {
        localStorage.setItem('userCoins', '0');
    }
    if (!localStorage.getItem('membershipStatus')) {
        localStorage.setItem('membershipStatus', 'false');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Bottom Navigation
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
            
            // Navigate to page
            const page = this.getAttribute('data-page');
            navigateTo(page);
        });
    });
    
    console.log("✅ Event listeners setup complete");
}

// Navigation System
function navigateTo(page) {
    console.log("📍 Navigating to:", page);
    
    // Load page content
    switch(page) {
        case 'home':
            loadHomePage();
            break;
        case 'membership':
            loadMembershipPage();
            break;
        case 'profile':
            loadProfilePage();
            break;
        default:
            loadHomePage();
    }
}

// ============================================
// HOME PAGE (FINAL VERSION)
// ============================================

function loadHomePage() {
    const mainContent = document.getElementById('mainContent');
    
    if (!mainContent) {
        console.error("❌ mainContent element not found!");
        return;
    }
    
    console.log("📄 Loading Home Page...");
    
    mainContent.innerHTML = `
        <div class="home-page">
            <!-- Section 1: Featured Audiobooks -->
            <section class="audio-section">
                <div class="section-header">
                    <h2>🔥 Top Picks for You</h2>
                </div>
                <div class="carousel" id="featuredCarousel">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </section>
            
            <!-- Section 2: Recently Added -->
            <section class="audio-section">
                <div class="section-header">
                    <h2>📚 Recently Added</h2>
                </div>
                <div class="carousel" id="recentCarousel">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </section>
            
            <!-- Section 3: Most Popular -->
            <section class="audio-section">
                <div class="section-header">
                    <h2>⭐ Most Popular</h2>
                </div>
                <div class="carousel" id="popularCarousel">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </section>
            
            <!-- Section 4: All Audiobooks (GRID - 4 per row) -->
            <section class="all-audiobooks-section">
                <div class="section-header">
                    <h2>🎧 All Audiobooks</h2>
                </div>
                <div class="all-audiobooks-grid" id="allAudiobooksGrid">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </section>
        </div>
    `;
    
    // Load audiobooks
    loadAudiobooks();
}

// Load Audiobooks from Firestore
async function loadAudiobooks() {
    try {
        console.log("📡 Fetching audiobooks from Firestore...");
        
        const snapshot = await db.collection('audiobooks')
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            console.warn("⚠️ No audiobooks found");
            document.getElementById('featuredCarousel').innerHTML = `
                <div class="no-books">
                    <div style="font-size: 3rem; margin-bottom: 15px;">📚</div>
                    <h3>No audiobooks yet</h3>
                    <p>Add some books to get started!</p>
                </div>
            `;
            return;
        }
        
        console.log(`✅ Loaded ${snapshot.size} audiobooks`);
        
        // Store all books
        window.allAudiobooks = [];
        snapshot.forEach(doc => {
            window.allAudiobooks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Display in different sections - SIRF 4 BOOKS HAR SECTION ME ✅
        displayFeaturedBooks(window.allAudiobooks.slice(0, 4));
        displayRecentBooks(window.allAudiobooks.slice(0, 4));
        displayPopularBooks(window.allAudiobooks.slice(0, 4));
        
        // Display ALL audiobooks in GRID (4 per row)
        displayAllAudiobooks(window.allAudiobooks);
        
    } catch (error) {
        console.error("❌ Error loading audiobooks:", error);
        document.getElementById('featuredCarousel').innerHTML = `
            <div class="no-books">
                <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                <h3>Error Loading Audiobooks</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Display Featured Books - SIRF 4 ✅
function displayFeaturedBooks(books) {
    const container = document.getElementById('featuredCarousel');
    if (!container) return;
    
    container.innerHTML = '';
    books.forEach(book => {
        container.innerHTML += createMobileBookCard(book);
    });
}

// Display Recent Books - SIRF 4 ✅
function displayRecentBooks(books) {
    const container = document.getElementById('recentCarousel');
    if (!container) return;
    
    container.innerHTML = '';
    books.forEach(book => {
        container.innerHTML += createMobileBookCard(book);
    });
}

// Display Popular Books - SIRF 4 ✅
function displayPopularBooks(books) {
    const container = document.getElementById('popularCarousel');
    if (!container) return;
    
    // Sort by plays
    const sorted = [...books].sort((a, b) => (b.plays || 0) - (a.plays || 0));
    
    container.innerHTML = '';
    sorted.forEach(book => {
        container.innerHTML += createMobileBookCard(book);
    });
}

// Display ALL Audiobooks - Grid Layout (4 per row) ✅
function displayAllAudiobooks(books) {
    const container = document.getElementById('allAudiobooksGrid');
    if (!container) return;
    
    if (books.length === 0) {
        container.innerHTML = `
            <div class="no-books">
                <div style="font-size: 3rem; margin-bottom: 15px;">📚</div>
                <h3>No audiobooks available</h3>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    books.forEach(book => {
        container.innerHTML += createMobileBookCard(book);
    });
}

// Create Mobile-Optimized Book Card
function createMobileBookCard(book) {
    const rating = book.rating || 4.5;
    const plays = book.plays || Math.floor(Math.random() * 10000000);
    const playsFormatted = formatPlays(plays);
    
    return `
        <div class="audio-card" onclick="openBook('${book.id}')">
            <div class="card-image">
                <img src="${book.coverUrl || 'https://via.placeholder.com/200x300/ab47bc/FFFFFF?text=DreamFM'}" 
                     alt="${book.title}"
                     onerror="this.src='https://via.placeholder.com/200x300/ab47bc/FFFFFF?text=DreamFM'">
                <span class="plays-badge">${playsFormatted}+</span>
            </div>
            <div class="card-info">
                <div class="stats">
                    <span>${playsFormatted} PLAYS</span>
                    <span><i class="fa-solid fa-star"></i> ${rating.toFixed(1)}</span>
                </div>
                <p class="title">${book.title}</p>
            </div>
        </div>
    `;
}

// Format Plays Number
function formatPlays(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num;
}

// Open Book (Play Audiobook)
function openBook(bookId) {
    console.log("📖 Opening book:", bookId);
    
    // Find book
    const book = window.allAudiobooks.find(b => b.id === bookId);
    
    if (book) {
        // Add to history
        addToHistory(book);
        
        // Play audiobook
        playAudiobook(bookId, book);
    } else {
        console.error("❌ Book not found:", bookId);
        showToast("❌ Book not found!");
    }
}

// Add to History
function addToHistory(book) {
    let history = JSON.parse(localStorage.getItem('historyBooks') || '[]');
    
    // Remove if already exists
    history = history.filter(b => b.id !== book.id);
    
    // Add to beginning
    history.unshift({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        timestamp: Date.now()
    });
    
    // Keep only last 5
    history = history.slice(0, 5);
    
    localStorage.setItem('historyBooks', JSON.stringify(history));
}

// Toggle Like Book
window.toggleLikeBook = function(bookId) {
    const book = window.allAudiobooks.find(b => b.id === bookId);
    if (!book) return;
    
    let likedBooks = JSON.parse(localStorage.getItem('likedBooks') || '[]');
    
    const index = likedBooks.findIndex(b => b.id === bookId);
    
    if (index > -1) {
        // Remove from liked
        likedBooks.splice(index, 1);
        showToast("❌ Removed from liked books");
    } else {
        // Add to liked (max 5)
        if (likedBooks.length >= 5) {
            likedBooks.pop();
        }
        
        likedBooks.unshift({
            id: book.id,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            timestamp: Date.now()
        });
        
        showToast("❤️ Added to liked books");
    }
    
    localStorage.setItem('likedBooks', JSON.stringify(likedBooks));
    
    // Reload profile if on that page
    if (document.querySelector('.profile-page')) {
        loadProfilePage();
    }
}

// ============================================
// MEMBERSHIP/COINS PAGE
// ============================================

function loadMembershipPage() {
    const mainContent = document.getElementById('mainContent');
    
    const userCoins = parseInt(localStorage.getItem('userCoins') || '0');
    const isMember = localStorage.getItem('membershipStatus') === 'true';
    
    mainContent.innerHTML = `
        <div class="membership-page">
            <!-- Header -->
            <div class="membership-header">
                <h1>💎 Premium Membership</h1>
                <p>Unlock unlimited audiobooks</p>
            </div>
            
            <!-- Coin Balance -->
            <div class="coin-balance-card">
                <div class="coin-icon">🪙</div>
                <div class="coin-info">
                    <h2>${userCoins} Coins</h2>
                    <p>Your current balance</p>
                </div>
            </div>
            
            <!-- Membership Section -->
            <section class="membership-section">
                <div class="section-header">
                    <h2>🌟 Premium Membership</h2>
                </div>
                
                <div class="membership-card ${isMember ? 'active-membership' : ''}">
                    <div class="membership-badge">
                        ${isMember ? '✅ ACTIVE' : '👑 PREMIUM'}
                    </div>
                    <h3>DreamFM Premium</h3>
                    <div class="membership-price">
                        <span class="price">₹29</span>
                        <span class="duration">/month</span>
                    </div>
                    <ul class="membership-features">
                        <li>✅ Unlimited audiobook access</li>
                        <li>✅ No ads interruption</li>
                        <li>✅ Offline download</li>
                        <li>✅ Early access to new releases</li>
                        <li>✅ Priority support</li>
                    </ul>
                    <button class="membership-btn ${isMember ? 'active' : ''}" 
                            onclick="${isMember ? 'cancelMembership()' : 'purchaseMembership()'}">
                        ${isMember ? 'Cancel Membership' : 'Get Premium Now'}
                    </button>
                </div>
            </section>
            
            <!-- Coins Packages -->
            <section class="coins-section">
                <div class="section-header">
                    <h2>🪙 Buy Coins</h2>
                    <p>Use coins to unlock chapters</p>
                </div>
                
                <div class="coins-grid">
                    <div class="coin-package" onclick="purchaseCoins(1, 50)">
                        <div class="coin-icon-pkg">🪙</div>
                        <h3>50 Coins</h3>
                        <div class="coin-price">₹1</div>
                        <button class="coin-btn">Buy Now</button>
                    </div>
                    
                    <div class="coin-package popular" onclick="purchaseCoins(5, 300)">
                        <div class="popular-badge">🔥 POPULAR</div>
                        <div class="coin-icon-pkg">🪙</div>
                        <h3>300 Coins</h3>
                        <div class="coin-price">₹5</div>
                        <div class="coin-bonus">+20% Bonus</div>
                        <button class="coin-btn">Buy Now</button>
                    </div>
                    
                    <div class="coin-package best-value" onclick="purchaseCoins(10, 700)">
                        <div class="popular-badge">💎 BEST VALUE</div>
                        <div class="coin-icon-pkg">🪙</div>
                        <h3>700 Coins</h3>
                        <div class="coin-price">₹10</div>
                        <div class="coin-bonus">+40% Bonus</div>
                        <button class="coin-btn">Buy Now</button>
                    </div>
                </div>
            </section>
            
            <!-- How It Works -->
            <section class="how-it-works">
                <h2>How Coins Work</h2>
                <div class="work-steps">
                    <div class="work-step">
                        <div class="step-icon">1️⃣</div>
                        <h3>Buy Coins</h3>
                        <p>Choose a coin package</p>
                    </div>
                    <div class="work-step">
                        <div class="step-icon">2️⃣</div>
                        <h3>Unlock Chapters</h3>
                        <p>Use coins to unlock premium chapters</p>
                    </div>
                    <div class="work-step">
                        <div class="step-icon">3️⃣</div>
                        <h3>Enjoy</h3>
                        <p>Listen to your favorite audiobooks</p>
                    </div>
                </div>
            </section>
        </div>
    `;
}

// Purchase Membership
window.purchaseMembership = function() {
    const confirm = window.confirm('Purchase DreamFM Premium for ₹29/month?');
    
    if (confirm) {
        localStorage.setItem('membershipStatus', 'true');
        showToast('🎉 Premium Membership Activated!');
        loadMembershipPage();
    }
}

// Cancel Membership
window.cancelMembership = function() {
    const confirm = window.confirm('Are you sure you want to cancel your membership?');
    
    if (confirm) {
        localStorage.setItem('membershipStatus', 'false');
        showToast('❌ Membership Cancelled');
        loadMembershipPage();
    }
}

// Purchase Coins
window.purchaseCoins = function(price, coins) {
    const confirm = window.confirm(`Purchase ${coins} coins for ₹${price}?`);
    
    if (confirm) {
        const currentCoins = parseInt(localStorage.getItem('userCoins') || '0');
        localStorage.setItem('userCoins', (currentCoins + coins).toString());
        showToast(`🪙 ${coins} coins added!`);
        loadMembershipPage();
    }
}

// ============================================
// PROFILE PAGE (WITH LIKED & HISTORY)
// ============================================

function loadProfilePage() {
    const mainContent = document.getElementById('mainContent');
    
    if (!window.currentUser) {
        mainContent.innerHTML = `
            <div class="profile-page">
                <div class="auth-container">
                    <div style="font-size: 5rem; margin-bottom: 20px;">🔒</div>
                    <h1>Login Required</h1>
                    <p>Please login to access your profile</p>
                </div>
            </div>
        `;
        return;
    }
    
    const user = window.currentUser;
    const userCoins = parseInt(localStorage.getItem('userCoins') || '0');
    const isMember = localStorage.getItem('membershipStatus') === 'true';
    const likedBooks = JSON.parse(localStorage.getItem('likedBooks') || '[]');
    const historyBooks = JSON.parse(localStorage.getItem('historyBooks') || '[]');
    
    mainContent.innerHTML = `
        <div class="profile-page">
            <!-- Profile Header -->
            <div class="profile-header">
                <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + user.email}" 
                     class="profile-avatar-large">
                <h1>${user.displayName || 'User'}</h1>
                <p>${user.email}</p>
                ${isMember ? '<div class="premium-badge">👑 Premium Member</div>' : ''}
            </div>
            
            <!-- Stats -->
            <div class="profile-stats">
                <div class="stat-card">
                    <div class="stat-icon">🪙</div>
                    <h3>${userCoins}</h3>
                    <p>Coins</p>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">❤️</div>
                    <h3>${likedBooks.length}</h3>
                    <p>Liked</p>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📚</div>
                    <h3>${historyBooks.length}</h3>
                    <p>History</p>
                </div>
            </div>
            
            <!-- Liked Audiobooks -->
            <section class="profile-section">
                <div class="section-header">
                    <h2>❤️ Liked Audiobooks</h2>
                </div>
                ${likedBooks.length > 0 ? `
                    <div class="profile-books-carousel">
                        ${likedBooks.map(book => createProfileBookCard(book, 'liked')).join('')}
                    </div>
                ` : '<p class="empty-state">No liked books yet</p>'}
            </section>
            
            <!-- History -->
            <section class="profile-section">
                <div class="section-header">
                    <h2>📖 Recently Played</h2>
                </div>
                ${historyBooks.length > 0 ? `
                    <div class="profile-books-carousel">
                        ${historyBooks.map(book => createProfileBookCard(book, 'history')).join('')}
                    </div>
                ` : '<p class="empty-state">No history yet</p>'}
            </section>
            
            <!-- Actions -->
            <div class="profile-actions">
                <button class="profile-btn" onclick="navigateTo('membership')">
                    <i class="fa-solid fa-crown"></i>
                    ${isMember ? 'Manage Membership' : 'Get Premium'}
                </button>
                <button class="profile-btn" onclick="window.logout()">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    Logout
                </button>
                <button class="profile-btn" onclick="clearAllData()">
                    <i class="fa-solid fa-trash"></i>
                    Clear All Data
                </button>
            </div>
        </div>
    `;
}

// Create Profile Book Card
function createProfileBookCard(book, type) {
    return `
        <div class="profile-book-card" onclick="openBook('${book.id}')">
            <div class="profile-book-cover">
                <img src="${book.coverUrl || 'https://via.placeholder.com/150x200/ab47bc/FFFFFF?text=Book'}" 
                     alt="${book.title}"
                     onerror="this.src='https://via.placeholder.com/150x200/ab47bc/FFFFFF?text=Book'">
                ${type === 'liked' ? `
                    <button class="remove-btn" onclick="event.stopPropagation(); removeLikedBook('${book.id}')">
                        <i class="fa-solid fa-heart-broken"></i>
                    </button>
                ` : ''}
            </div>
            <div class="profile-book-info">
                <h4>${book.title}</h4>
                <p>${book.author || 'Unknown'}</p>
            </div>
        </div>
    `;
}

// Remove Liked Book
window.removeLikedBook = function(bookId) {
    let likedBooks = JSON.parse(localStorage.getItem('likedBooks') || '[]');
    likedBooks = likedBooks.filter(b => b.id !== bookId);
    localStorage.setItem('likedBooks', JSON.stringify(likedBooks));
    showToast('❌ Removed from liked books');
    loadProfilePage();
}

// Clear All Data
window.clearAllData = function() {
    const confirm = window.confirm('Clear all your data (history, liked books)?');
    
    if (confirm) {
        localStorage.setItem('likedBooks', '[]');
        localStorage.setItem('historyBooks', '[]');
        showToast('🗑️ All data cleared');
        loadProfilePage();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show Toast Notification
function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Console helper
console.log(`
%c🎧 DreamFM Console Commands 🎧

%cnavigateTo('home') %c- Go to home
%cnavigateTo('membership') %c- Go to membership
%cnavigateTo('profile') %c- Go to profile
%ctoggleLikeBook('bookId') %c- Like/Unlike book

`, 
'font-size: 16px; font-weight: bold; color: #ab47bc;',
'color: #ab47bc; font-weight: bold;', 'color: #ccc;',
'color: #ab47bc; font-weight: bold;', 'color: #ccc;',
'color: #ab47bc; font-weight: bold;', 'color: #ccc;',
'color: #ab47bc; font-weight: bold;', 'color: #ccc;'
);
