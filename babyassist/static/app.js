let player;
let isLocked = true;
let unlockTimer = null;
let currentPlaylistId = ''; // 기본값은 첫 번째 로드된 재생목록으로 설정됨
const LOCK_DURATION = 5000; // 5초 잠금 해제 홀드 시간

let youtubeApiReady = false;
let domReady = false;
let initialPlaylistIdToLoad = null;

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
    if (domReady && initialPlaylistIdToLoad) {
        console.log("DOM was ready, API is now ready, initializing player with stored playlist ID.");
        initializePlayer(initialPlaylistIdToLoad);
        initialPlaylistIdToLoad = null; 
    } else if (domReady && !player && currentPlaylistId) {
        console.log("DOM ready, API now ready, currentPlaylistId exists. Initializing player.");
        initializePlayer(currentPlaylistId);
    } else {
        console.log("YouTube API ready. Waiting for DOM or playlist selection.");
    }
}

function initializePlayer(playlistId) {
    if (!youtubeApiReady) {
        console.log("YouTube API not ready yet. Player initialization deferred. Storing playlist ID: ", playlistId);
        initialPlaylistIdToLoad = playlistId; 
        return;
    }
    if (player) {
        player.destroy();
    }
    const currentAppOrigin = 'https://baby-assist-videoblock.vercel.app'; // 하드코딩된 origin
    console.log(`Initializing player with playlist: ${playlistId} and origin: ${currentAppOrigin}`);
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
            'list': playlistId,
            'origin': currentAppOrigin // 하드코딩된 값 사용
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
    if (event.data == YT.PlayerState.ENDED) {
        player.playVideo(); // 또는 player.loadPlaylist(currentPlaylistId); 로 다음 비디오로
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
        if (isLocked && !e.target.closest('.modal') && !e.target.closest('#mainPlaylistSelect')) { // 재생목록 선택은 허용
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });
    
    document.addEventListener('click', function(e) {
        // mainPlaylistSelect 클릭 허용을 위해 조건 수정 필요 없음 (기본 동작)
        if (isLocked && !e.target.closest('.modal') && !e.target.closest('.unlock-trigger') && !e.target.closest('#mainPlaylistSelectContainer')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true }); // capture true로 하여 재생목록 드롭다운 상호작용 전 차단

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
    
    loadPlaylistsForMainSelector(); // 페이지 로드 시 재생목록 로드
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

async function loadPlaylistsForMainSelector() {
    console.log("Loading playlists for main selector...");
    try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const playlists = await response.json();
        console.log("Playlists fetched:", playlists);
        
        const selectElement = document.getElementById('mainPlaylistSelect');
        if (!selectElement) {
            console.error('Main playlist select element not found');
            return;
        }
        selectElement.innerHTML = ''; // 기존 옵션 초기화

        if (playlists && playlists.length > 0) {
            playlists.forEach(playlist => {
                const option = document.createElement('option');
                option.value = playlist.youtube_id;
                option.textContent = playlist.title;
                selectElement.appendChild(option);
            });
            
            if (!currentPlaylistId && playlists[0]) {
                currentPlaylistId = playlists[0].youtube_id;
                selectElement.value = currentPlaylistId; // Select 드롭다운 값도 설정
                console.log("Default playlist ID set to:", currentPlaylistId);
                initialPlaylistIdToLoad = currentPlaylistId; 
                if (youtubeApiReady) { 
                    console.log("API was already ready, initializing player now for default playlist.");
                    initializePlayer(currentPlaylistId);
                    initialPlaylistIdToLoad = null;
                }
            } else if (currentPlaylistId) {
                 selectElement.value = currentPlaylistId;
                 console.log("Retained currentPlaylistId:", currentPlaylistId);
                 initialPlaylistIdToLoad = currentPlaylistId;
                 if (youtubeApiReady && !player) { 
                     console.log("API ready and no player, initializing with retained playlist ID.");
                     initializePlayer(currentPlaylistId);
                     initialPlaylistIdToLoad = null;
                 }
            } else {
                 console.log("No playlists to set as default or retain.");
            }

            selectElement.removeEventListener('change', handleMainPlaylistSelection); // 기존 리스너 제거
            selectElement.addEventListener('change', handleMainPlaylistSelection);
            console.log("Playlist selector populated and event listener attached.");
        } else {
            console.log('No playlists received or empty playlist array.');
            // 재생목록이 없을 경우의 처리 (예: 메시지 표시)
            if (player) player.destroy(); // 플레이어 중지 또는 제거
            const playerDiv = document.getElementById('player');
            if(playerDiv) playerDiv.innerHTML = '<p>재생목록을 불러올 수 없습니다. 관리자 페이지에서 재생목록을 추가해주세요.</p>';
        }
    } catch (error) {
        console.error('Error fetching playlists:', error);
        const playerDiv = document.getElementById('player');
        if(playerDiv) playerDiv.innerHTML = '<p>재생목록 로딩 중 오류가 발생했습니다.</p>';
    }
}

function handleMainPlaylistSelection() {
    const selectElement = document.getElementById('mainPlaylistSelect');
    if (!selectElement) return;
    currentPlaylistId = selectElement.value;
    console.log("Playlist selection changed to:", currentPlaylistId);
    
    if (player && player.loadPlaylist) {
        console.log("Loading new playlist into existing player.");
        player.loadPlaylist({
            listType: 'playlist',
            list: currentPlaylistId
        });
    } else {
        console.log("No player, or player cannot load playlist. Initializing new player.");
        initializePlayer(currentPlaylistId); // 플레이어가 없으면 초기화
    }
    // 재생목록 변경 시 자동으로 앱 잠금 (사용자 요청 사항)
    // lockApp(); // 바로 잠그면 UI가 이상할 수 있으니, 사용자가 영상을 보기 시작하면 잠기는 형태로 고려
    // 여기서는 isLocked 상태를 true로 설정하고, 관리자 컨트롤을 숨기는 것을 의미.
    // 실제 '잠금' 화면 오버레이 등을 즉시 활성화 하지는 않음.
    if (!isLocked) { // 만약 잠금 해제 상태였다면, 다시 잠금 상태로 (컨트롤 숨김)
        isLocked = true; // 내부 상태만 잠금으로 변경
        localStorage.setItem('appUnlocked', 'false'); // 로컬 스토리지도 업데이트
        hideControlsPostUnlock(); // 관리자용 컨트롤 숨김
    }
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
