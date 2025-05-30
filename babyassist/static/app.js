let player;
let isLocked = true;
let unlockTimer = null;
// let currentPlaylistId = ''; // 재생목록 ID 대신 단일 비디오 ID 사용
const DEFAULT_VIDEO_ID = 'dQw4w9WgXcQ'; // 여기에 원하는 유튜브 비디오 ID를 넣으세요.
let currentVideoId = DEFAULT_VIDEO_ID;
const LOCK_DURATION = 5000; // 5초 잠금 해제 홀드 시간

let youtubeApiReady = false;
let domReady = false;
// let initialPlaylistIdToLoad = null; // 단일 비디오용으로 변경
let initialVideoIdToLoad = null;

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
    const currentAppOrigin = 'https://baby-assist-videoblock.vercel.app'; // 하드코딩된 origin
    console.log(`Initializing player with videoId: ${videoId} and origin: ${currentAppOrigin}`);
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId, // playlist 관련 옵션 대신 videoId 사용
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'iv_load_policy': 3,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0,
            'loop': 1, // 단일 영상 반복을 위해서는 playlist 플레이어 변수 추가 필요
            'playlist': videoId, // 단일 영상 반복을 위해 videoId를 playlist 파라미터에도 전달
            'origin': currentAppOrigin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
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
    
    loadYouTubeAPI(); // DOM이 준비되면 YouTube API 로드 시작

    const unlockTrigger = document.getElementById('unlockTrigger');
    
    // 이벤트 리스너 (터치, 클릭, 컨텍스트 메뉴) - 변경 없음
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
    
    // loadPlaylistsForMainSelector(); // 재생목록 로직 제거
    // 페이지 로드 시 기본 비디오 ID로 플레이어 초기화 시도
    currentVideoId = DEFAULT_VIDEO_ID; // 기본 비디오 ID 설정
    initialVideoIdToLoad = currentVideoId;
    if (youtubeApiReady && domReady) { // DOM과 API 모두 준비 시
        initializePlayer(currentVideoId);
        initialVideoIdToLoad = null;
    }
    
    checkUnlockStatus(); // 잠금 상태 확인 및 UI 업데이트

    // 새 컨트롤에 대한 이벤트 리스너 (예시)
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

async function lockApp() {
    // 서버에 알릴 필요가 있다면 /api/lock 호출 유지, 아니면 클라이언트에서만 처리
    try {
        await fetch('/api/lock', { method: 'POST' }); // 서버 세션도 업데이트 (선택적)
    } catch(e) { console.error("Error calling /api/lock:", e); }

    isLocked = true;
    localStorage.setItem('appUnlocked', 'false');
    hideControlsPostUnlock();
    // 플레이어가 있다면 화면 가리기 등 추가 작업 가능
    console.log("App locked");
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
    if (storedUnlockStatus === 'true') {
        isLocked = false;
        showControlsPostUnlock();
    } else {
        isLocked = true;
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
