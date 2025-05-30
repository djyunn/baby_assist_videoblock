
-- Baby Video Player용 Supabase 데이터베이스 스키마

-- 재생목록 테이블 생성
CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    youtube_id VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 재생목록 데이터 삽입
INSERT INTO playlists (title, youtube_id, description) VALUES
('Baby Songs', 'PLrAXtmRdnEQy4Qns2mwJNzQiJbmKuOQzP', 'Gentle baby songs and lullabies'),
('Educational Videos', 'PLrAXtmRdnEQy4Qns2mwJNzQiJbmKuOQzP', 'Learning videos for toddlers'),
('Nursery Rhymes', 'PLrAXtmRdnEQy4Qns2mwJNzQiJbmKuOQzP', 'Classic nursery rhymes for children');

-- Row Level Security (RLS) 활성화 (선택사항)
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 생성
CREATE POLICY "Enable read access for all users" ON playlists
    FOR SELECT USING (true);

-- 인증된 사용자만 추가/수정/삭제 가능하도록 정책 생성 (필요시)
-- CREATE POLICY "Enable insert for authenticated users only" ON playlists
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Enable update for authenticated users only" ON playlists
--     FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Enable delete for authenticated users only" ON playlists
--     FOR DELETE USING (auth.role() = 'authenticated');

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
