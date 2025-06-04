let player;
let isLocked = true;
let unlockTimer = null;
let currentVideoId = ''; // 현재 재생 중인 비디오 ID
const DEFAULT_VIDEO_ID = 'dQw4w9WgXcQ'; // 여기에 원하는 유튜브 비디오 ID를 넣으세요.
const LOCK_DURATION = 5000; // 5초 잠금 해제 홀드 시간

let youtubeApiReady = false;
let domReady = false;
let initialVideoIdToLoad = null; // 초기에 로드할 비디오 ID

// YouTube API 스크립트를 동적으로 로드하는 함수
function loadYouTubeAPI() {
    console.log("Attempting to load YouTube API script...");
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    // app.js 스크립트 이전에 삽입하거나, 없으면 body에 추가
    if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        (document.head || document.body).appendChild(tag);
    }
}

function onYouTubeIframeAPIReady() {
    console.log("onYouTubeIframeAPIReady function was CALLED!");
    youtubeApiReady = true;
    console.log("YouTube API is ready.");
    if (domReady && initialVideoIdToLoad) {
        console.log("DOM was ready, API is now ready, initializing player with stored video ID.");
        initializePlayer(initialVideoIdToLoad);
        initialVideoIdToLoad = null; 
    } else if (domReady && !player && currentVideoId) {
        console.log("DOM ready, API now ready, currentVideoId exists. Initializing player.");
        initializePlayer(currentVideoId);
    } else {
        console.log("YouTube API ready. Waiting for DOM or video ID.");
    }
}

function initializePlayer(videoId) {
    if (!youtubeApiReady) {
        console.log("YouTube API not ready yet. Player initialization deferred. Storing video ID: ", videoId);
        initialVideoIdToLoad = videoId; 
        return;
        
    }
    if (player) {
        player.destroy();
    }
    console.log(`Initializing player with videoId: ${videoId}`);
    const currentOrigin = window.location.origin;
    console.log('Current origin:', currentOrigin);
    
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId, 
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
            'playlist': videoId,
            'origin': currentOrigin,
            'host': currentOrigin,
            'enablejsapi': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': function(event) {
                console.log('Player error:', event.data);
            }
        }
    });
}

function onPlayerReady(event) {
    console.log("Player is ready.");
    event.target.playVideo();
    setVolume(50);
}

function onPlayerStateChange(event) {
    // 단일 영상의 경우, YT.PlayerState.ENDED에서 loop:1과 playlist 파라미터 조합으로 자동 반복됨
    // 필요시 추가 로직 (예: player.playVideo();)
    if (event.data === YT.PlayerState.ENDED) {
        console.log("Video ended, loop should restart it.");
    }
}

function setVolume(volume) {
    if (player && player.setVolume) {
        player.setVolume(volume);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    domReady = true;
    console.log("DOM content loaded.");
    
    loadYouTubeAPI();

    const unlockTrigger = document.getElementById('unlockTrigger');
    
    document.addEventListener('touchstart', function(e) {
        if (isLocked && !e.target.closest('.modal') && !e.target.closest('#mainVideoSelect') && !e.target.closest('#pwaInstallBanner')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });
    
    document.addEventListener('click', function(e) {
        if (isLocked && !e.target.closest('.modal') && !e.target.closest('.unlock-trigger') && 
            !e.target.closest('#mainVideoSelectContainer') && !e.target.closest('#pwaInstallBanner')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true });
    
    document.addEventListener('contextmenu', function(e) {
        if (isLocked) {
            e.preventDefault();
        }
    });
    
    if (unlockTrigger) {
        unlockTrigger.addEventListener('mousedown', startUnlockTimer);
        unlockTrigger.addEventListener('touchstart', startUnlockTimer);
        unlockTrigger.addEventListener('mouseup', cancelUnlockTimer);
        unlockTrigger.addEventListener('touchend', cancelUnlockTimer);
        unlockTrigger.addEventListener('mouseleave', cancelUnlockTimer);
    } else {
        console.error("Unlock trigger not found!");
    }
    
    loadVideosForMainSelector();
    checkUnlockStatus();

    const relockButton = document.getElementById('relockButton');
    if (relockButton) {
        relockButton.addEventListener('click', lockApp);
    }
    const goToSettingsButton = document.getElementById('goToSettingsButton');
    if (goToSettingsButton) {
        goToSettingsButton.addEventListener('click', openSettingsPage);
    }
});

function startUnlockTimer(e) {
    e.preventDefault();
    unlockTimer = setTimeout(showUnlockModal, LOCK_DURATION);
}

function cancelUnlockTimer() {
    if (unlockTimer) {
        clearTimeout(unlockTimer);
        unlockTimer = null;
    }
}

function showUnlockModal() {
    const unlockModal = document.getElementById('unlockModal');
    if(unlockModal) unlockModal.classList.remove('hidden');
    const passwordInput = document.getElementById('passwordInput');
    if(passwordInput) passwordInput.focus();
}

function closeUnlockModal() {
    const unlockModal = document.getElementById('unlockModal');
    if(unlockModal) unlockModal.classList.add('hidden');
    const passwordInput = document.getElementById('passwordInput');
    if(passwordInput) passwordInput.value = '';
    const errorMessageElement = document.getElementById('errorMessage');
    if(errorMessageElement) errorMessageElement.classList.add('hidden');
}

async function attemptUnlock() {
    const passwordInput = document.getElementById('passwordInput');
    if (!passwordInput) return;
    const password = passwordInput.value;
    const errorMessageElement = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('/api/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            isLocked = false;
            localStorage.setItem('appUnlocked', 'true');
            document.getElementById('lockOverlay').style.display = 'none';
            closeUnlockModal();
            showControlsPostUnlock();
        } else {
            if(errorMessageElement) {
                errorMessageElement.textContent = result.error || '잘못된 비밀번호입니다.';
                errorMessageElement.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error unlocking:', error);
        if(errorMessageElement) {
            errorMessageElement.textContent = '오류가 발생했습니다.';
            errorMessageElement.classList.remove('hidden');
        }
    }
}

function showControlsPostUnlock() {
    const postUnlockControls = document.getElementById('postUnlockControls');
    if (postUnlockControls) {
        postUnlockControls.classList.remove('hidden');
    }
    // 메인 재생목록 선택기는 항상 보이므로 여기서 제어할 필요 없음
    // document.getElementById('mainPlaylistSelectContainer').classList.add('hidden'); // 잠금 해제 시 재생목록 선택 가리기 (선택적)
}

function hideControlsPostUnlock() {
    const postUnlockControls = document.getElementById('postUnlockControls');
    if (postUnlockControls) {
        postUnlockControls.classList.add('hidden');
    }
    // document.getElementById('mainPlaylistSelectContainer').classList.remove('hidden'); // 잠금 시 재생목록 선택 다시 표시
}

function checkUnlockStatus() {
    const storedUnlockStatus = localStorage.getItem('appUnlocked');
    const lockOverlay = document.getElementById('lockOverlay');
    if (storedUnlockStatus === 'true') {
        isLocked = false;
        if(lockOverlay) {
            lockOverlay.style.display = 'none';
            lockOverlay.classList.remove('active');
        }
        showControlsPostUnlock();
    } else {
        isLocked = true;
        if(lockOverlay) {
            lockOverlay.style.display = 'flex';
            lockOverlay.classList.add('active');
        }
        hideControlsPostUnlock();
    }
    console.log("Checked unlock status. isLocked:", isLocked);
}

function openSettingsPage() {
    // 이 함수는 '설정 페이지 가기' 버튼과 연결됨
    // 이미 잠금 해제된 상태에서만 이 버튼이 보이므로, isLocked 체크는 불필요할 수 있음
    if (!isLocked) {
        window.location.href = '/admin';
    } else {
        // 만약을 위해 잠금 모달을 보여줄 수 있지만, 버튼 자체가 잠금 해제 시에만 보여야 함
        showUnlockModal();
    }
}


// Keyboard shortcuts (when unlocked) - 기존 코드 유지
document.addEventListener('keydown', function(e) {
    if (!isLocked) { // isLocked 상태에 따라 키보드 단축키 활성화/비활성화
        if (!player || typeof player.getPlayerState !== 'function') return; // 플레이어 준비 안됐으면 종료

        switch(e.key) {
            case ' ': // Spacebar
                e.preventDefault();
                if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                const currentVolumeUp = player.getVolume();
                setVolume(Math.min(100, currentVolumeUp + 10));
                break;
            case 'ArrowDown':
                e.preventDefault();
                const currentVolumeDown = player.getVolume();
                setVolume(Math.max(0, currentVolumeDown - 10));
                break;
        }
    }
});

// PWA 설치 버튼 로직은 index.html에 있으므로 여기서는 특별히 처리할 필요 없음.
// 다만, PWA 설치 배너 관련 DOM 요소 ID가 정확한지 확인 필요.
// ('pwaInstallBanner', 'pwaInstallBtn', 'pwaCloseBtn')

async function loadVideosForMainSelector() {
    console.log("Loading videos for main selector...");
    try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const videos = await response.json();
        console.log("Videos fetched:", videos);
        
        const selectElement = document.getElementById('mainVideoSelect');
        if (!selectElement) {
            console.error('Main video select element not found');
            return;
        }
        selectElement.innerHTML = '<option value="">동영상을 선택하세요</option>';

        if (videos && videos.length > 0) {
            videos.forEach(video => {
                const option = document.createElement('option');
                option.value = video.youtube_id;
                option.textContent = video.title;
                selectElement.appendChild(option);
            });

            selectElement.removeEventListener('change', handleVideoSelection);
            selectElement.addEventListener('change', handleVideoSelection);
            console.log("Video selector populated and event listener attached.");
        } else {
            console.log('No videos received or empty video array.');
            const playerDiv = document.getElementById('player');
            if(playerDiv) playerDiv.innerHTML = '<p>동영상을 불러올 수 없습니다. 관리자 페이지에서 동영상을 추가해주세요.</p>';
        }
    } catch (error) {
        console.error('Error fetching videos:', error);
        const playerDiv = document.getElementById('player');
        if(playerDiv) playerDiv.innerHTML = '<p>동영상 로딩 중 오류가 발생했습니다.</p>';
    }
}

function handleVideoSelection() {
    const selectElement = document.getElementById('mainVideoSelect');
    if (!selectElement || !selectElement.value) return;
    
    currentVideoId = selectElement.value;
    console.log("Video selection changed to:", currentVideoId);
    
    // 비디오 컨테이너 표시
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
        videoContainer.classList.remove('hidden');
    }
    
    if (player && player.loadVideoById) {
        console.log("Loading new video into existing player.");
        player.loadVideoById(currentVideoId);
    } else {
        console.log("No player, or player cannot load video by ID. Initializing new player.");
        initializePlayer(currentVideoId);
    }

    // 비디오 변경 시 앱을 다시 잠금 상태로 만듭니다.
    isLocked = true;
    localStorage.setItem('appUnlocked', 'false');
    const lockOverlay = document.getElementById('lockOverlay');
    if(lockOverlay) {
        lockOverlay.style.display = 'flex';
        lockOverlay.classList.add('active');
    }
    hideControlsPostUnlock();
    console.log("Video changed, app re-locked (overlay shown, controls hidden).");
}

async function lockApp() {
    try {
        await fetch('/api/lock', { method: 'POST' });
    } catch(e) { 
        console.error("Error calling /api/lock:", e); 
    }
    
    isLocked = true;
    localStorage.setItem('appUnlocked', 'false');
    const lockOverlay = document.getElementById('lockOverlay');
    if(lockOverlay) {
        lockOverlay.style.display = 'flex';
        lockOverlay.classList.add('active');
    }
    hideControlsPostUnlock();
    console.log("App locked");
}
