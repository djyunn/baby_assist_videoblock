
async function deletePlaylist(playlistId) {
    if (!confirm('정말로 이 재생목록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/playlists/${playlistId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            location.reload(); // Refresh the page to show updated list
        } else {
            alert('삭제 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

async function addPlaylist() {
    const title = document.getElementById('playlistTitle').value;
    const youtubeId = document.getElementById('playlistId').value;
    const description = document.getElementById('playlistDescription').value;
    
    if (!title || !youtubeId) {
        alert('제목과 YouTube 재생목록 ID를 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/playlists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                youtube_id: youtubeId,
                description: description
            })
        });
        
        if (response.ok) {
            // Clear form
            document.getElementById('playlistTitle').value = '';
            document.getElementById('playlistId').value = '';
            document.getElementById('playlistDescription').value = '';
            
            location.reload(); // Refresh to show new playlist
        } else {
            alert('추가 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('추가 중 오류가 발생했습니다.');
    }
}

function goBack() {
    window.location.href = '/';
}
