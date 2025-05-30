
# Baby Video Player - PWA

아기용 안전한 YouTube 플레이어 웹앱입니다. PWA로 구축되어 모바일 기기에 설치 가능합니다.

## 기능

- 🔒 화면 잠금으로 아기의 실수 조작 방지
- 📱 PWA 지원 (홈 화면에 설치 가능)
- 🎵 YouTube 재생목록 자동 재생
- ⚙️ 관리자 설정 (비밀번호: 1234)
- 🌐 Supabase 데이터베이스 연동

## 설치 및 실행

1. **환경변수 설정**
   `.env` 파일을 생성하고 다음 내용을 추가:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   UNLOCK_PASSWORD=1234
   ```

2. **Supabase 설정**
   - [Supabase](https://supabase.com)에서 새 프로젝트 생성
   - SQL Editor에서 `supabase_schema.sql` 파일 내용 실행
   - Project Settings > API에서 URL과 anon key 복사

3. **앱 실행**
   ```bash
   python main.py
   ```

## PWA 설치

- 모바일에서 앱 접속 시 "홈 화면에 추가" 배너가 표시됩니다
- 또는 브라우저 메뉴에서 "홈 화면에 추가" 선택

## 관리자 기능

1. 우측 상단 원을 3초간 길게 누르기
2. 비밀번호 입력 (기본값: 1234)
3. 재생목록 추가/삭제 및 설정 변경

## 기술 스택

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Flask (Python)
- **Database**: Supabase (PostgreSQL)
- **PWA**: Service Worker, Web App Manifest
