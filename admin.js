// ============================================
// DREAMFM ADMIN PANEL - COMPLETE SYSTEM
// ============================================

console.log('🔧 Admin Panel Loading...');

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAxXvJt6m-IK2G_EstbvYQZBj5wMBaqFeM",
    authDomain: "dreamfm-a6694.firebaseapp.com",
    projectId: "dreamfm-a6694",
    storageBucket: "dreamfm-a6694.firebasestorage.app",
    messagingSenderId: "634304814330",
    appId: "1:634304814330:web:e4fd0cd5e36276c37d3d43"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// B2 Configuration
const B2_CONFIG = {
    keyId: '0054e79ba39f5820000000001',
    appKey: 'K005QdPVGM7anNg9BOTU9OhpYoEx85Y',
    bucketName: 'novel-audiobooks',
    bucketId: '743eb7896bea33e99fa50812'
};

// Admin Emails (Add your admin emails here)
const ADMIN_EMAILS = [
    'vikassingh44999@gmail.com', // ✅ CHANGE THIS to your email
    'vikassingh44999@gmail.com'
];

// Global State
let currentAdmin = null;
let b2AuthToken = null;
let b2UploadUrl = null;

// ============================================
// AUTHENTICATION
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Check if admin
    if (!ADMIN_EMAILS.includes(user.email)) {
        alert('⚠️ Access Denied! You are not an admin.');
        await auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    currentAdmin = user;
    console.log('✅ Admin authenticated:', user.email);
    
    document.getElementById('authCheck').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    document.getElementById('adminEmail').textContent = user.email;

    // Initialize
    await initializeB2();
    loadDashboard();
    loadBooks();
    loadUsers();
});

async function logout() {
    await auth.signOut();
    window.location.href = 'login.html';
}

// ============================================
// B2 AUTHORIZATION
// ============================================

async function initializeB2() {
    try {
        const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                'Authorization': 'Basic ' + btoa(B2_CONFIG.keyId + ':' + B2_CONFIG.appKey)
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('B2 Authorization failed');
        }

        b2AuthToken = data.authorizationToken;
        
        // Get upload URL
        const uploadUrlResponse = await fetch(`${data.apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: {
                'Authorization': b2AuthToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bucketId: B2_CONFIG.bucketId })
        });

        const uploadData = await uploadUrlResponse.json();
        b2UploadUrl = uploadData.uploadUrl;
        b2AuthToken = uploadData.authorizationToken;

        console.log('✅ B2 Initialized');
    } catch (error) {
        console.error('❌ B2 Init Error:', error);
        showAlert('error', 'B2 connection failed: ' + error.message);
    }
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Mark nav item as active
    event.target.classList.add('active');

    // Load page data
    if (pageId === 'dashboard') loadDashboard();
    if (pageId === 'books') loadBooks();
    if (pageId === 'users') loadUsers();
    if (pageId === 'analytics') loadAnalytics();
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    try {
        // Get total books
        const booksSnapshot = await db.collection('audiobooks').get();
        document.getElementById('totalBooks').textContent = booksSnapshot.size;

        // Get total chapters
        let totalChapters = 0;
        booksSnapshot.forEach(doc => {
            totalChapters += doc.data().totalChapters || 0;
        });
        document.getElementById('totalChapters').textContent = totalChapters;

        // Get total users
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnapshot.size;

        // Storage used (estimate)
        const storageUsed = (booksSnapshot.size * 50).toFixed(0); // Estimate 50MB per book
        document.getElementById('storageUsed').textContent = storageUsed + ' MB';

        // Recent activity
        loadRecentActivity();

    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    
    try {
        const snapshot = await db.collection('audiobooks')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p>No recent activity</p>';
            return;
        }

        let html = '<ul style="list-style: none; padding: 0;">';
        snapshot.forEach(doc => {
            const book = doc.data();
            const date = book.createdAt ? book.createdAt.toDate().toLocaleDateString() : 'Unknown';
            html += `<li style="padding: 10px 0; border-bottom: 1px solid var(--border);">
                📚 <strong>${book.title}</strong> added on ${date}
            </li>`;
        });
        html += '</ul>';
        
        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p>Error loading activity</p>';
    }
}

// ============================================
// AUDIOBOOKS MANAGEMENT
// ============================================

async function loadBooks() {
    const tbody = document.getElementById('booksTable');
    const select = document.getElementById('chapterBookSelect');
    
    try {
        const snapshot = await db.collection('audiobooks')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No audiobooks yet</td></tr>';
            return;
        }

        let tableHtml = '';
        let selectHtml = '<option value="">Choose a book...</option>';

        snapshot.forEach(doc => {
            const book = doc.data();
            tableHtml += `
                <tr>
                    <td><img src="${book.coverUrl || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; border-radius: 5px; object-fit: cover;"></td>
                    <td>${book.title}</td>
                    <td>${book.author || 'Unknown'}</td>
                    <td>${book.totalChapters || 0}</td>
                    <td><span style="color: var(--success);">✓ Active</span></td>
                    <td>
                        <button class="btn btn-small" style="padding: 5px 10px; margin-right: 5px;" onclick="editBook('${doc.id}')">Edit</button>
                        <button class="btn btn-danger" style="padding: 5px 10px;" onclick="deleteBook('${doc.id}', '${book.title}')">Delete</button>
                    </td>
                </tr>
            `;

            selectHtml += `<option value="${doc.id}">${book.title}</option>`;
        });

        tbody.innerHTML = tableHtml;
        select.innerHTML = selectHtml;

    } catch (error) {
        console.error('Load books error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Error loading books</td></tr>';
    }
}

async function deleteBook(bookId, bookTitle) {
    if (!confirm(`Delete "${bookTitle}"? This will also delete all chapters.`)) {
        return;
    }

    try {
        await db.collection('audiobooks').doc(bookId).delete();
        showAlert('success', 'Book deleted successfully!');
        loadBooks();
        loadDashboard();
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('error', 'Failed to delete book: ' + error.message);
    }
}

function editBook(bookId) {
    alert('Edit feature coming soon! Book ID: ' + bookId);
    // TODO: Implement edit functionality
}

// ============================================
// UPLOAD NEW BOOK
// ============================================

// File Upload Areas
document.addEventListener('DOMContentLoaded', () => {
    const coverArea = document.getElementById('coverUploadArea');
    const coverInput = document.getElementById('coverImageInput');
    const audioArea = document.getElementById('audioUploadArea');
    const audioInput = document.getElementById('audioFilesInput');

    if (coverArea) {
        coverArea.addEventListener('click', () => coverInput.click());
        coverArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            coverArea.classList.add('dragover');
        });
        coverArea.addEventListener('dragleave', () => {
            coverArea.classList.remove('dragover');
        });
        coverArea.addEventListener('drop', (e) => {
            e.preventDefault();
            coverArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                coverInput.files = e.dataTransfer.files;
                handleCoverUpload(e.dataTransfer.files[0]);
            }
        });

        coverInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleCoverUpload(e.target.files[0]);
            }
        });
    }

    if (audioArea) {
        audioArea.addEventListener('click', () => audioInput.click());
        audioArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            audioArea.classList.add('dragover');
        });
        audioArea.addEventListener('dragleave', () => {
            audioArea.classList.remove('dragover');
        });
        audioArea.addEventListener('drop', (e) => {
            e.preventDefault();
            audioArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                audioInput.files = e.dataTransfer.files;
                handleAudioFiles(e.dataTransfer.files);
            }
        });

        audioInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleAudioFiles(e.target.files);
            }
        });
    }

    // Form submission
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleBookUpload);
    }

    // Auto-generate slug from title
    const titleInput = document.getElementById('bookTitle');
    const slugInput = document.getElementById('bookSlug');
    if (titleInput && slugInput) {
        titleInput.addEventListener('input', (e) => {
            const slug = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
            slugInput.value = slug;
        });
    }
});

let coverFile = null;
let audioFiles = [];

function handleCoverUpload(file) {
    if (!file.type.startsWith('image/')) {
        showAlert('error', 'Please upload an image file');
        return;
    }

    coverFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('coverPreview').innerHTML = `
            <img src="${e.target.result}" style="max-width: 200px; border-radius: 8px;">
            <p style="margin-top: 10px; color: var(--success);">✓ Cover image selected</p>
        `;
    };
    reader.readAsDataURL(file);
}

function handleAudioFiles(files) {
    audioFiles = Array.from(files);
    
    let html = '<h4>Selected Audio Files:</h4><ul style="list-style: none; padding: 0;">';
    audioFiles.forEach((file, index) => {
        const size = (file.size / 1024 / 1024).toFixed(2);
        html += `<li style="padding: 8px; background: rgba(255,255,255,0.05); margin-bottom: 5px; border-radius: 5px;">
            🎵 ${file.name} (${size} MB)
        </li>`;
    });
    html += '</ul>';
    
    document.getElementById('audioFilesList').innerHTML = html;
}

// ============================================
// UPLOAD TO B2 & FIREBASE
// ============================================

async function handleBookUpload(e) {
    e.preventDefault();

    const bookData = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        narrator: document.getElementById('bookNarrator').value,
        description: document.getElementById('bookDescription').value,
        category: document.getElementById('bookCategory').value,
        language: document.getElementById('bookLanguage').value,
        audioSlug: document.getElementById('bookSlug').value,
        totalChapters: parseInt(document.getElementById('bookChapters').value),
        duration: document.getElementById('bookDuration').value,
        rating: 0,
        plays: 0
    };

    // Validation
    if (!bookData.title || !bookData.author || !bookData.audioSlug) {
        showAlert('error', 'Please fill all required fields');
        return;
    }

    if (audioFiles.length === 0) {
        showAlert('error', 'Please upload at least one audio file');
        return;
    }

    try {
        document.getElementById('uploadProgress').style.display = 'block';
        updateProgress(0, 'Starting upload...');

        // Step 1: Upload cover image to Firebase Storage
        let coverUrl = 'https://via.placeholder.com/400x600';
        
        if (coverFile) {
            updateProgress(10, 'Uploading cover image...');
            const coverRef = storage.ref(`covers/${bookData.audioSlug}.jpg`);
            await coverRef.put(coverFile);
            coverUrl = await coverRef.getDownloadURL();
            console.log('✅ Cover uploaded:', coverUrl);
        }

        bookData.coverUrl = coverUrl;

        // Step 2: Upload audio files to B2
        updateProgress(30, `Uploading ${audioFiles.length} audio files to B2...`);
        
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            const fileName = `${bookData.audioSlug}/${file.name}`;
            
            updateProgress(30 + (i / audioFiles.length) * 50, `Uploading ${file.name}...`);
            
            await uploadToB2(file, fileName);
            console.log(`✅ Uploaded: ${fileName}`);
        }

        // Step 3: Save metadata to Firebase
        updateProgress(90, 'Saving to database...');
        
        bookData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('audiobooks').add(bookData);
        
        updateProgress(100, 'Upload complete!');
        
        showAlert('success', `✅ "${bookData.title}" uploaded successfully!`);
        
        // Reset form
        document.getElementById('uploadForm').reset();
        document.getElementById('coverPreview').innerHTML = '';
        document.getElementById('audioFilesList').innerHTML = '';
        coverFile = null;
        audioFiles = [];
        
        setTimeout(() => {
            document.getElementById('uploadProgress').style.display = 'none';
            loadBooks();
            loadDashboard();
        }, 2000);

    } catch (error) {
        console.error('❌ Upload error:', error);
        showAlert('error', 'Upload failed: ' + error.message);
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

async function uploadToB2(file, fileName) {
    try {
        // Re-authorize if needed
        if (!b2UploadUrl || !b2AuthToken) {
            await initializeB2();
        }

        const response = await fetch(b2UploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': b2AuthToken,
                'X-Bz-File-Name': encodeURIComponent(fileName),
                'Content-Type': 'audio/mpeg',
                'X-Bz-Content-Sha1': 'do_not_verify'
            },
            body: file
        });

        if (!response.ok) {
            throw new Error(`B2 upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('B2 upload result:', result);
        
        return result;

    } catch (error) {
        console.error('B2 upload error:', error);
        throw error;
    }
}

function updateProgress(percent, message) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('uploadStatus').textContent = message;
}

// ============================================
// USERS MANAGEMENT
// ============================================

async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    
    try {
        const snapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No users yet</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const date = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'Unknown';
            const isPremium = user.isPremium ? '👑 Premium' : 'Free';
            
            html += `
                <tr>
                    <td>${user.email}</td>
                    <td>${user.displayName || '-'}</td>
                    <td>${date}</td>
                    <td>${isPremium}</td>
                    <td>
                        <button class="btn btn-small" style="padding: 5px 10px;" onclick="viewUser('${doc.id}')">View</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('Load users error:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Error loading users</td></tr>';
    }
}

function viewUser(userId) {
    alert('User details coming soon! User ID: ' + userId);
    // TODO: Show user details modal
}

// ============================================
// ANALYTICS
// ============================================

async function loadAnalytics() {
    try {
        // Get all books with play counts
        const snapshot = await db.collection('audiobooks')
            .orderBy('plays', 'desc')
            .limit(10)
            .get();

        let totalPlays = 0;
        let topBook = '-';
        let maxPlays = 0;

        const topBooksHtml = [];

        snapshot.forEach(doc => {
            const book = doc.data();
            totalPlays += book.plays || 0;
            
            if ((book.plays || 0) > maxPlays) {
                maxPlays = book.plays || 0;
                topBook = book.title;
            }

            topBooksHtml.push(`
                <div style="padding: 15px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                    <div>
                        <strong>${book.title}</strong>
                        <br>
                        <small style="color: rgba(255,255,255,0.6);">${book.author}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: var(--primary);">${book.plays || 0}</strong>
                        <br>
                        <small>plays</small>
                    </div>
                </div>
            `);
        });

        document.getElementById('totalPlays').textContent = totalPlays;
        document.getElementById('popularBook').textContent = topBook;
        document.getElementById('topBooks').innerHTML = topBooksHtml.join('') || '<p>No data yet</p>';

    } catch (error) {
        console.error('Analytics error:', error);
    }
}

// ============================================
// CHAPTERS MANAGEMENT
// ============================================

async function loadChapters(bookId) {
    const container = document.getElementById('chaptersContent');
    
    if (!bookId) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5);">Select a book to view chapters</p>';
        return;
    }

    try {
        const bookDoc = await db.collection('audiobooks').doc(bookId).get();
        const book = bookDoc.data();

        let html = `
            <h3>${book.title} - Chapters</h3>
            <p style="color: rgba(255,255,255,0.6); margin-bottom: 20px;">Total: ${book.totalChapters} chapters</p>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Chapter</th>
                            <th>Audio File</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (let i = 1; i <= book.totalChapters; i++) {
            const audioUrl = `https://gentle-union-d9c6.singhvikas21571.workers.dev/${book.audioSlug}/chapter-${i}.mp3`;
            
            html += `
                <tr>
                    <td>${i}</td>
                    <td>Chapter ${i}</td>
                    <td><small>${book.audioSlug}/chapter-${i}.mp3</small></td>
                    <td><span style="color: var(--success);">✓ Available</span></td>
                    <td>
                        <button class="btn btn-small" style="padding: 5px 10px;" onclick="window.open('${audioUrl}', '_blank')">Test</button>
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Load chapters error:', error);
        container.innerHTML = '<p style="color: var(--danger);">Error loading chapters</p>';
    }
}

// ============================================
// UTILITIES
// ============================================

function showAlert(type, message) {
    const alertDiv = document.getElementById('uploadAlert');
    if (!alertDiv) return;

    alertDiv.className = type === 'success' ? 'alert alert-success' : 'alert alert-error';
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

console.log('✅ Admin Panel Loaded');
