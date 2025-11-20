// ============================================
// DREAMFM SECURE AUDIO PLAYER (WITH COINS)
// ============================================

console.log("🎧 Secure Player.js loaded");

// Global Player State
const PlayerState = {
    currentBook: null,
    currentChapter: 1,
    isPlaying: false,
    audioElement: null,
    playbackSpeed: 1.0,
    volume: 1.0,
    blobUrl: null,
    unlockedChapters: [] // Track unlocked chapters
};

// 🔒 SECURITY: Disable Right Click & DevTools
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'AUDIO' || e.target.closest('.audio-player')) {
        e.preventDefault();
        showToast('⚠️ Download not allowed');
    }
});

// 🔒 Disable common download shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 's') || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.key === 'u')) {
        if (document.querySelector('.full-player').style.display === 'block') {
            e.preventDefault();
            showToast('⚠️ Action not allowed');
        }
    }
});

// 🔒 DevTools Detection
let devtoolsOpen = false;
const detectDevTools = () => {
    const threshold = 160;
    if (window.outerWidth - window.innerWidth > threshold || 
        window.outerHeight - window.innerHeight > threshold) {
        if (!devtoolsOpen && PlayerState.isPlaying) {
            devtoolsOpen = true;
            console.log('DevTools detected - pausing for security');
            PlayerState.audioElement.pause();
            PlayerState.isPlaying = false;
            updatePlayButton();
            showToast('⚠️ Please close DevTools to continue');
        }
    } else {
        devtoolsOpen = false;
    }
};
setInterval(detectDevTools, 1000);

// Initialize Audio Element
function initializePlayer() {
    PlayerState.audioElement = document.getElementById('audioElement');
    
    if (!PlayerState.audioElement) {
        console.error("❌ Audio element not found!");
        return;
    }
    
    // 🔒 Hide controls (custom player only)
    PlayerState.audioElement.controls = false;
    PlayerState.audioElement.controlsList = 'nodownload noplaybackrate';
    
    // Event Listeners
    PlayerState.audioElement.addEventListener('loadedmetadata', onAudioLoaded);
    PlayerState.audioElement.addEventListener('timeupdate', onTimeUpdate);
    PlayerState.audioElement.addEventListener('ended', onAudioEnded);
    PlayerState.audioElement.addEventListener('error', onAudioError);
    
    // Control Buttons
    document.getElementById('miniPlayBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
    });
    
    document.getElementById('playPauseBtn')?.addEventListener('click', togglePlayPause);
    document.getElementById('prevChapterBtn')?.addEventListener('click', previousChapter);
    document.getElementById('nextChapterBtn')?.addEventListener('click', nextChapter);
    document.getElementById('closePlayer')?.addEventListener('click', closeFullPlayer);
    
    // Open full player when clicking mini player
    const miniPlayerContent = document.querySelector('.mini-player-content');
    miniPlayerContent?.addEventListener('click', openFullPlayer);
    
    document.getElementById('seekBar')?.addEventListener('input', onSeek);
    document.getElementById('volumeSlider')?.addEventListener('input', onVolumeChange);
    document.getElementById('speedBtn')?.addEventListener('click', cycleSpeed);
    document.getElementById('chaptersBtn')?.addEventListener('click', toggleChaptersList);
    
    console.log("✅ Secure Player initialized");
}

// 🔒 Secure Audio Loading
function playAudiobook(bookId, bookData) {
    console.log("🎵 Playing:", bookData.title);
    
    PlayerState.currentBook = {
        id: bookId,
        ...bookData
    };
    PlayerState.currentChapter = 1;
    PlayerState.unlockedChapters = [1]; // Chapter 1 always free
    
    updatePlayerUI();
    loadChapter(1);
    
    document.getElementById('miniPlayer').style.display = 'block';
    openFullPlayer();
}

// 🔒 Load Chapter with Coin Check
async function loadChapter(chapterNum) {
    const book = PlayerState.currentBook;
    
    if (!book) {
        console.error("❌ No book loaded");
        return;
    }
    
    // Check if chapter needs to be unlocked
    if (!PlayerState.unlockedChapters.includes(chapterNum)) {
        const unlocked = await checkAndUnlockChapter(chapterNum);
        if (!unlocked) {
            return; // User cancelled or insufficient coins
        }
    }
    
    PlayerState.currentChapter = chapterNum;
    
    // Clean up old blob URL
    if (PlayerState.blobUrl) {
        URL.revokeObjectURL(PlayerState.blobUrl);
    }
    
    // Generate secure URL
    const audioUrl = generateAudioURL(book.audioSlug, chapterNum);
    console.log("🔒 Loading secure audio...");
    
    try {
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
            throw new Error('Audio file not found');
        }
        
        const blob = await response.blob();
        PlayerState.blobUrl = URL.createObjectURL(blob);
        
        PlayerState.audioElement.src = PlayerState.blobUrl;
        PlayerState.audioElement.load();
        
        updatePlayerUI();
        showToast(`📖 Chapter ${chapterNum} loaded`);
        
    } catch (error) {
        console.error('❌ Load error:', error);
        showToast(`❌ Chapter ${chapterNum} not available`);
    }
}

// 💰 Check and Unlock Chapter
async function checkAndUnlockChapter(chapterNum) {
    const CHAPTER_COST = 10; // 10 coins per chapter
    
    // Check if user has membership (free unlock)
    const membershipStatus = localStorage.getItem('membershipStatus') === 'true';
    
    if (membershipStatus) {
        PlayerState.unlockedChapters.push(chapterNum);
        showToast(`✅ Chapter ${chapterNum} unlocked (Premium)`);
        return true;
    }
    
    // Ask user to unlock with coins
    const confirmUnlock = confirm(`Unlock Chapter ${chapterNum} for ${CHAPTER_COST} coins?`);
    
    if (!confirmUnlock) {
        return false;
    }
    
    // Check if useCoins function exists (from coins.js)
    if (typeof window.useCoins === 'function') {
        const success = await window.useCoins(
            CHAPTER_COST, 
            `Unlocked Chapter ${chapterNum} of ${PlayerState.currentBook.title}`
        );
        
        if (success) {
            PlayerState.unlockedChapters.push(chapterNum);
            return true;
        } else {
            // Not enough coins
            const buyMore = confirm("Not enough coins! Want to buy more?");
            if (buyMore && typeof navigateTo === 'function') {
                closeFullPlayer();
                navigateTo('membership');
            }
            return false;
        }
    } else {
        // Fallback if coins.js not loaded
        console.warn("⚠️ Coins system not loaded");
        PlayerState.unlockedChapters.push(chapterNum);
        return true;
    }
}

// Generate Audio URL
function generateAudioURL(audioSlug, chapterNum) {
    const WORKER_URL = 'https://gentle-union-d9c6.singhvikas21571.workers.dev';
    return `${WORKER_URL}/${audioSlug}/chapter-${chapterNum}.mp3`;
}

// Update Player UI
function updatePlayerUI() {
    const book = PlayerState.currentBook;
    if (!book) return;
    
    const chapterNum = PlayerState.currentChapter;
    
    // Mini Player
    document.getElementById('miniCover').src = book.coverUrl;
    document.getElementById('miniTitle').textContent = book.title;
    document.getElementById('miniChapter').textContent = `Chapter ${chapterNum}`;
    
    // Full Player
    document.getElementById('playerCoverImg').src = book.coverUrl;
    document.getElementById('playerBookTitle').textContent = book.title;
    document.getElementById('playerAuthor').textContent = book.author;
    document.getElementById('playerChapterTitle').textContent = `Chapter ${chapterNum}`;
    
    updatePlayButton();
    loadChaptersList();
}

// Toggle Play/Pause
function togglePlayPause() {
    if (!PlayerState.audioElement || !PlayerState.audioElement.src) {
        showToast("⚠️ No audio loaded");
        return;
    }
    
    if (PlayerState.isPlaying) {
        PlayerState.audioElement.pause();
        PlayerState.isPlaying = false;
    } else {
        PlayerState.audioElement.play()
            .then(() => {
                PlayerState.isPlaying = true;
                updatePlayButton();
            })
            .catch(err => {
                console.error("❌ Play error:", err);
                showToast("❌ Failed to play audio");
            });
    }
    
    updatePlayButton();
}

// Update Play Button
function updatePlayButton() {
    const miniBtn = document.getElementById('miniPlayBtn');
    const fullBtn = document.getElementById('playPauseBtn');
    
    if (PlayerState.isPlaying) {
        if (miniBtn) miniBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if (fullBtn) fullBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
        if (miniBtn) miniBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        if (fullBtn) fullBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
}

// Previous Chapter
function previousChapter() {
    if (PlayerState.currentChapter > 1) {
        loadChapter(PlayerState.currentChapter - 1);
        if (PlayerState.isPlaying) {
            setTimeout(() => PlayerState.audioElement.play(), 100);
        }
    } else {
        showToast("📖 Already at first chapter");
    }
}

// Next Chapter
function nextChapter() {
    const book = PlayerState.currentBook;
    if (book && PlayerState.currentChapter < book.totalChapters) {
        loadChapter(PlayerState.currentChapter + 1);
        if (PlayerState.isPlaying) {
            setTimeout(() => PlayerState.audioElement.play(), 100);
        }
    } else {
        showToast("📖 No more chapters");
    }
}

// Audio Event Handlers
function onAudioLoaded() {
    const duration = PlayerState.audioElement.duration;
    console.log("✅ Audio loaded, duration:", formatTime(duration));
    document.getElementById('durationDisplay').textContent = formatTime(duration);
}

function onTimeUpdate() {
    const current = PlayerState.audioElement.currentTime;
    const duration = PlayerState.audioElement.duration;
    
    if (duration > 0) {
        const percentage = (current / duration) * 100;
        
        document.getElementById('miniProgressBar').style.width = percentage + '%';
        document.getElementById('seekBar').value = percentage;
        document.getElementById('currentTimeDisplay').textContent = formatTime(current);
    }
}

function onAudioEnded() {
    console.log("✅ Chapter ended");
    PlayerState.isPlaying = false;
    updatePlayButton();
    
    // Auto play next chapter
    setTimeout(() => nextChapter(), 1000);
}

function onAudioError(e) {
    console.error("❌ Audio error:", e);
    showToast('❌ Audio file not found!');
    PlayerState.isPlaying = false;
    updatePlayButton();
}

// Seek
function onSeek(e) {
    const percentage = e.target.value;
    const duration = PlayerState.audioElement.duration;
    
    if (duration > 0) {
        PlayerState.audioElement.currentTime = (percentage / 100) * duration;
    }
}

// Volume Change
function onVolumeChange(e) {
    const volume = e.target.value / 100;
    PlayerState.audioElement.volume = volume;
    PlayerState.volume = volume;
}

// Cycle Speed
function cycleSpeed() {
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(PlayerState.playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    
    PlayerState.playbackSpeed = speeds[nextIndex];
    PlayerState.audioElement.playbackRate = PlayerState.playbackSpeed;
    
    document.getElementById('speedBtn').textContent = PlayerState.playbackSpeed + 'x';
    showToast(`⚡ Speed: ${PlayerState.playbackSpeed}x`);
}

// Toggle Chapters List
function toggleChaptersList() {
    const chaptersList = document.getElementById('chaptersList');
    if (chaptersList.style.display === 'none' || chaptersList.style.display === '') {
        chaptersList.style.display = 'block';
    } else {
        chaptersList.style.display = 'none';
    }
}

// Load Chapters List (with lock icons)
function loadChaptersList() {
    const book = PlayerState.currentBook;
    if (!book) return;
    
    const container = document.getElementById('chaptersContent');
    container.innerHTML = '';
    
    const membershipStatus = localStorage.getItem('membershipStatus') === 'true';
    
    for (let i = 1; i <= book.totalChapters; i++) {
        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'chapter-item';
        
        const isUnlocked = PlayerState.unlockedChapters.includes(i) || membershipStatus;
        
        if (i === PlayerState.currentChapter) {
            chapterDiv.classList.add('active');
        }
        
        const lockIcon = isUnlocked ? 
            '<i class="fa-solid fa-book-open"></i>' : 
            '<i class="fa-solid fa-lock"></i> 🪙10';
        
        chapterDiv.innerHTML = `
            ${lockIcon}
            <span>Chapter ${i}</span>
        `;
        
        chapterDiv.addEventListener('click', () => {
            loadChapter(i);
            if (PlayerState.isPlaying) {
                setTimeout(() => PlayerState.audioElement.play(), 100);
            }
            toggleChaptersList();
        });
        
        container.appendChild(chapterDiv);
    }
}

// Open/Close Full Player
function openFullPlayer() {
    document.getElementById('fullPlayer').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeFullPlayer() {
    document.getElementById('fullPlayer').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Format Time
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Toast Notification
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (PlayerState.blobUrl) {
        URL.revokeObjectURL(PlayerState.blobUrl);
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initializePlayer);

console.log("✅ Player ready with Coins system");
