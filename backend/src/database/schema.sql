-- =====================================================
-- EDUCMS DATABASE SCHEMA
-- =====================================================
-- Safe to re-run: drops dependent objects first.
-- =====================================================

DROP VIEW IF EXISTS post_statistics CASCADE;
DROP VIEW IF EXISTS user_statistics CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS post_revisions CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(20) DEFAULT 'subscriber' CHECK (role IN ('admin', 'editor', 'author', 'subscriber')),
    bio TEXT,
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255)
);

-- =====================================================
-- CATEGORIES (self-referencing for hierarchy)
-- =====================================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- POSTS
-- =====================================================
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured_image VARCHAR(255),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,

    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,

    is_featured BOOLEAN DEFAULT false,
    allow_comments BOOLEAN DEFAULT true,
    reading_time INTEGER,

    search_vector tsvector
);

-- =====================================================
-- POST REVISIONS (versioning / rollback)
-- =====================================================
CREATE TABLE post_revisions (
    revision_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    edited_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TAGS
-- =====================================================
CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_tags (
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(tag_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id)
);

-- =====================================================
-- COMMENTS (threaded, moderated)
-- =====================================================
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    parent_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'trash')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MEDIA
-- =====================================================
CREATE TABLE media (
    media_id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ACTIVITY LOG (audit trail)
-- =====================================================
CREATE TABLE activity_log (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- REFRESH TOKENS (JWT refresh rotation)
-- =====================================================
CREATE TABLE refresh_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published ON posts(published_at);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_featured ON posts(is_featured);
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);

CREATE INDEX idx_tags_slug ON tags(slug);

CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_file_type ON media(file_type);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);

CREATE INDEX idx_revisions_post ON post_revisions(post_id);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- =====================================================
-- TRIGGERS: updated_at maintenance
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: maintain full-text search vector
-- =====================================================
CREATE OR REPLACE FUNCTION posts_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('french', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(NEW.excerpt, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(regexp_replace(NEW.content, '<[^>]+>', ' ', 'g'), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, excerpt, content ON posts
    FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

-- =====================================================
-- VIEWS
-- =====================================================
CREATE OR REPLACE VIEW post_statistics AS
SELECT
    p.post_id,
    p.title,
    p.status,
    p.view_count,
    p.like_count,
    COUNT(DISTINCT c.comment_id) FILTER (WHERE c.status = 'approved') AS comment_count,
    COUNT(DISTINCT pt.tag_id) AS tag_count,
    u.username AS author
FROM posts p
LEFT JOIN comments c ON p.post_id = c.post_id
LEFT JOIN post_tags pt ON p.post_id = pt.post_id
LEFT JOIN users u ON p.author_id = u.user_id
GROUP BY p.post_id, u.username;

CREATE OR REPLACE VIEW user_statistics AS
SELECT
    u.user_id,
    u.username,
    u.role,
    COUNT(DISTINCT p.post_id) AS total_posts,
    COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.post_id END) AS published_posts,
    COUNT(DISTINCT c.comment_id) AS total_comments,
    COALESCE(SUM(p.view_count), 0) AS total_views
FROM users u
LEFT JOIN posts p ON u.user_id = p.author_id
LEFT JOIN comments c ON u.user_id = c.user_id
GROUP BY u.user_id, u.username, u.role;

-- =====================================================
-- FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION get_category_post_count(cat_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    post_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO post_count
    FROM posts
    WHERE category_id = cat_id AND status = 'published';
    RETURN post_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_reading_time(input_content TEXT)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
    result_time INTEGER;
BEGIN
    word_count := array_length(regexp_split_to_array(trim(input_content), '\s+'), 1);
    result_time := CEIL(word_count::NUMERIC / 200);
    RETURN GREATEST(result_time, 1);
END;
$$ LANGUAGE plpgsql;
