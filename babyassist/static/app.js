
let player;
let isLocked = true;
let unlockTimer = null;
let currentPlaylistId = 'PLrAXtmRdnEQy4Qns2mwJNzQiJbmKuOQzP'; // Default playlist

// YouTube API ready callback
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'iv_load_policy': 3,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0,
            'loop': 1,
            'listType': 'playlist',
            'list': currentPlaylistId
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
    setVolume(50); // Set moderate volume for babies
}

function onPlayerStateChange(event) {
    // Auto-restart if video ends
    if (event.data == YT.PlayerState.ENDED) {
        player.playVideo();
    }
}

function setVolume(volume) {
    if (player && player.setVolume) {
        player.setVolume(volume);
    }
}

// Lock functionality
document.addEventListener('DOMContentLoaded', function() {
    const unlockTrigger = document.getElementById('unlockTrigger');
    const unlockModal = document.getElementById('unlockModal');
    const passwordInput = document.getElementById('passwordInput');
    
    // Prevent all interactions when locked
    document.addEventListener('touchstart', function(e) {
        if (isLocked && !e.target.closest('.modal')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });
    
    document.addEventListener('click', function(e) {
        if (isLocked && !e.target.closest('.modal') && !e.target.closest('.unlock-trigger')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });
    
    document.addEventListener('contextmenu', function(e) {
        if (isLocked) {
            e.preventDefault();
        }
    });
    
    // Unlock trigger (long press)
    unlockTrigger.addEventListener('mousedown', startUnlockTimer);
    unlockTrigger.addEventListener('touchstart', startUnlockTimer);
    unlockTrigger.addEventListener('mouseup', cancelUnlockTimer);
    unlockTrigger.addEventListener('touchend', cancelUnlockTimer);
    unlockTrigger.addEventListener('mouseleave', cancelUnlockTimer);
    
    // Check unlock status on load
    checkUnlockStatus();
});

function startUnlockTimer(e) {
    e.preventDefault();
    unlockTimer = setTimeout(showUnlockModal, 3000); // 3 second hold
}

function cancelUnlockTimer() {
    if (unlockTimer) {
        clearTimeout(unlockTimer);
        unlockTimer = null;
    }
}

function showUnlockModal() {
    document.getElementById('unlockModal').classList.remove('hidden');
    document.getElementById('passwordInput').focus();
}

function closeUnlockModal() {
    document.getElementById('unlockModal').classList.add('hidden');
    document.getElementById('passwordInput').value = '';
    document.getElementById('errorMessage').classList.add('hidden');
}

async function attemptUnlock() {
    const password = document.getElementById('passwordInput').value;
    
    try {
        const response = await fetch('/api/unlock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isLocked = false;
            closeUnlockModal();
            showAdminPanel();
        } else {
            document.getElementById('errorMessage').textContent = '잘못된 비밀번호입니다.';
            document.getElementById('errorMessage').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('errorMessage').textContent = '오류가 발생했습니다.';
        document.getElementById('errorMessage').classList.remove('hidden');
    }
}

async function lockApp() {
    try {
        await fetch('/api/lock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        isLocked = true;
        hideAdminPanel();
    } catch (error) {
        console.error('Error:', error);
    }
}

function showAdminPanel() {
    document.getElementById('adminPanel').classList.remove('hidden');
}

function hideAdminPanel() {
    document.getElementById('adminPanel').classList.add('hidden');
}

async function checkUnlockStatus() {
    try {
        const response = await fetch('/api/is_unlocked');
        const result = await response.json();
        
        isLocked = !result.unlocked;
        
        if (!isLocked) {
            showAdminPanel();
        }
    } catch (error) {
        console.error('Error checking unlock status:', error);
    }
}

function changePlaylist() {
    const select = document.getElementById('playlistSelect');
    currentPlaylistId = select.value;
    
    if (player && player.loadPlaylist) {
        player.loadPlaylist({
            listType: 'playlist',
            list: currentPlaylistId
        });
    }
}

function openSettings() {
    window.location.href = '/admin';
}

// Keyboard shortcuts (when unlocked)
document.addEventListener('keydown', function(e) {
    if (!isLocked) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                const currentVolume = player.getVolume();
                setVolume(Math.min(100, currentVolume + 10));
                break;
            case 'ArrowDown':
                e.preventDefault();
                const currentVol = player.getVolume();
                setVolume(Math.max(0, currentVol - 10));
                break;
        }
    }
});
