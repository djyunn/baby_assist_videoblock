from flask import Flask, render_template, request, jsonify, session
import os
from datetime import datetime
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this')

# Supabase 설정
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None
    print("Supabase 연결 정보가 없습니다. 로컬 저장소를 사용합니다.")

# 기본 재생목록 (Supabase 없을 때 사용)
default_playlists = [
    {
        'id': 1,
        'title': 'Baby Songs',
        'youtube_id': 'PLrAXtmRdnEQy4Qns2mwJNzQiJbmKuOQzP',
        'description': 'Gentle baby songs and lullabies',
        'created_at': datetime.now().isoformat()
    },
    {
        'id': 2,
        'title': 'Educational Videos',
        'youtube_id': 'PLrAXtmRdnEQy4Qns2mwJNzQiJbmKuOQzP',
        'description': 'Learning videos for toddlers',
        'created_at': datetime.now().isoformat()
    }
]

# 기본 잠금 해제 비밀번호
UNLOCK_PASSWORD = os.getenv('UNLOCK_PASSWORD', '1234')

def get_playlists():
    """Supabase에서 재생목록을 가져오거나 기본값 반환"""
    if supabase:
        try:
            response = supabase.table('playlists').select("*").execute()
            return response.data
        except Exception as e:
            print(f"Supabase 오류: {e}")
            return default_playlists
    return default_playlists

def add_playlist_to_db(title, youtube_id, description=''):
    """Supabase에 새 재생목록 추가"""
    if supabase:
        try:
            response = supabase.table('playlists').insert({
                'title': title,
                'youtube_id': youtube_id,
                'description': description
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"재생목록 추가 오류: {e}")
            return None
    return None

def delete_playlist_from_db(playlist_id):
    """Supabase에서 재생목록 삭제"""
    if supabase:
        try:
            response = supabase.table('playlists').delete().eq('id', playlist_id).execute()
            return True
        except Exception as e:
            print(f"재생목록 삭제 오류: {e}")
            return False
    return False

@app.route('/')
def index():
    playlists = get_playlists()
    return render_template('index.html', playlists=playlists)

@app.route('/api/unlock', methods=['POST'])
def unlock():
    data = request.get_json()
    password = data.get('password')
    
    if password == UNLOCK_PASSWORD:
        session['unlocked'] = True
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Invalid password'})

@app.route('/api/lock', methods=['POST'])
def lock():
    session['unlocked'] = False
    return jsonify({'success': True})

@app.route('/api/is_unlocked')
def is_unlocked():
    return jsonify({'unlocked': session.get('unlocked', False)})

@app.route('/admin')
def admin():
    if not session.get('unlocked', False):
        return render_template('unlock.html')
    playlists = get_playlists()
    return render_template('admin.html', playlists=playlists, supabase_connected=supabase is not None)

@app.route('/api/playlists', methods=['GET'])
def get_playlists_api():
    playlists = get_playlists()
    return jsonify(playlists)

@app.route('/api/playlists', methods=['POST'])
def add_playlist():
    if not session.get('unlocked', False):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    title = data.get('title')
    youtube_id = data.get('youtube_id')
    description = data.get('description', '')
    
    if supabase:
        new_playlist = add_playlist_to_db(title, youtube_id, description)
        if new_playlist:
            return jsonify(new_playlist)
        else:
            return jsonify({'error': 'Failed to add playlist'}), 500
    else:
        # 로컬 저장 (세션용)
        new_playlist = {
            'id': len(default_playlists) + 1,
            'title': title,
            'youtube_id': youtube_id,
            'description': description,
            'created_at': datetime.now().isoformat()
        }
        default_playlists.append(new_playlist)
        return jsonify(new_playlist)

@app.route('/api/playlists/<int:playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    if not session.get('unlocked', False):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if supabase:
        success = delete_playlist_from_db(playlist_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Failed to delete playlist'}), 500
    else:
        # 로컬 삭제
        global default_playlists
        default_playlists = [p for p in default_playlists if p['id'] != playlist_id]
        return jsonify({'success': True})

# PWA 매니페스트 라우트
@app.route('/static/manifest.json')
def manifest():
    return app.send_static_file('manifest.json')

# Vercel은 app 객체를 직접 사용합니다.
# if __name__ == '__main__':
#     os.makedirs('templates', exist_ok=True) # 로컬 실행 시 필요
#     os.makedirs('static', exist_ok=True)   # 로컬 실행 시 필요
#     app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)))
