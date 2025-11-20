// ===================================
// DREAMFM - PWA INSTALLATION
// ===================================

console.log('📱 PWA Install Script Loading...');

let deferredPrompt = null;

// ===================================
// REGISTER SERVICE WORKER
// ===================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration.scope);
      
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update();
      }, 60000);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 New Service Worker found!');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('✨ New version available!');
            showUpdateNotification();
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  });
}

// ===================================
// PWA INSTALL PROMPT
// ===================================
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 Install prompt triggered');
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install prompt after 3 seconds
  setTimeout(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const installed = localStorage.getItem('pwa-installed');
    
    if (!dismissed && !installed) {
      showInstallPrompt();
    }
  }, 3000);
});

// Show Install Prompt
function showInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.style.display = 'flex';
    installPrompt.style.animation = 'slideUp 0.3s ease-out';
  }
}

// Install Button
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('installBtn');
  const dismissBtn = document.getElementById('dismissBtn');
  const installPrompt = document.getElementById('installPrompt');
  
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.log('❌ No install prompt available');
        showToast('❌ Install not available on this device');
        return;
      }
      
      // Show native install prompt
      deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log('📱 User choice:', outcome);
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed!');
        localStorage.setItem('pwa-installed', 'true');
        showToast('✅ App installed successfully! 🎉');
      } else {
        console.log('❌ Installation dismissed');
      }
      
      deferredPrompt = null;
      if (installPrompt) installPrompt.style.display = 'none';
    });
  }
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      if (installPrompt) installPrompt.style.display = 'none';
      localStorage.setItem('pwa-install-dismissed', 'true');
      // Reset after 7 days
      setTimeout(() => {
        localStorage.removeItem('pwa-install-dismissed');
      }, 7 * 24 * 60 * 60 * 1000);
    });
  }
});

// App Installed Event
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully!');
  localStorage.setItem('pwa-installed', 'true');
  deferredPrompt = null;
  
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) installPrompt.style.display = 'none';
  
  showToast('🎉 DreamFM installed! Launch from home screen.');
});

// ===================================
// UPDATE NOTIFICATION
// ===================================
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.className = 'update-banner';
  updateBanner.innerHTML = `
    <div class="update-content">
      <span>🔄 New version available!</span>
      <button onclick="updateApp()" class="btn-update">Update Now</button>
    </div>
  `;
  document.body.appendChild(updateBanner);
  
  setTimeout(() => {
    updateBanner.classList.add('show');
  }, 100);
}

// Update App
window.updateApp = async function() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration && registration.waiting) {
    registration.waiting.postMessage('SKIP_WAITING');
    window.location.reload();
  }
};

// ===================================
// CLEAR CACHE FUNCTIONS
// ===================================
window.clearAudioCache = function() {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log('✅ Audio cache cleared');
          showToast('🗑️ Offline audio cleared');
          resolve();
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        'CLEAR_AUDIO_CACHE',
        [messageChannel.port2]
      );
    } else {
      reject('Service Worker not available');
    }
  });
};

window.clearAllCache = function() {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log('✅ All cache cleared');
          showToast('🗑️ All offline data cleared');
          resolve();
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        'CLEAR_ALL_CACHE',
        [messageChannel.port2]
      );
    } else {
      reject('Service Worker not available');
    }
  });
};

// ===================================
// NETWORK STATUS
// ===================================
window.addEventListener('online', () => {
  console.log('✅ Back online');
  showToast('✅ Back online');
});

window.addEventListener('offline', () => {
  console.log('📡 Offline mode');
  showToast('📡 Offline - Cached content available');
});

// ===================================
// TOAST HELPER
// ===================================
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
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

console.log('✅ PWA Install Script Loaded');
