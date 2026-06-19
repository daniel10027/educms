/**
 * Seed script — populates the database with a demo admin account,
 * categories, tags, and sample posts.
 * Usage: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const seed = async () => {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const adminPassword = await bcrypt.hash('Admin123!', rounds);
    const editorPassword = await bcrypt.hash('Editor123!', rounds);
    const authorPassword = await bcrypt.hash('Author123!', rounds);

    const usersResult = await client.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, email_verified)
       VALUES
        ('admin', 'admin@educms.local', $1, 'Admin', 'Principal', 'admin', true, true),
        ('editor', 'editor@educms.local', $2, 'Edith', 'Reviewer', 'editor', true, true),
        ('author', 'author@educms.local', $3, 'Arthur', 'Writer', 'author', true, true)
       ON CONFLICT (username) DO NOTHING
       RETURNING user_id, username`,
      [adminPassword, editorPassword, authorPassword]
    );
    console.log(`   Created ${usersResult.rowCount} users`);

    const categoriesResult = await client.query(
      `INSERT INTO categories (name, slug, description, display_order)
       VALUES
        ('Informatique', 'informatique', 'Articles sur les fondamentaux de l''informatique', 1),
        ('Programmation', 'programmation', 'Tutoriels et guides de programmation', 2),
        ('Développement Web', 'developpement-web', 'Ressources pour le développement web', 3),
        ('Science des Données', 'science-des-donnees', 'Analyse de données et statistiques', 4),
        ('Intelligence Artificielle', 'intelligence-artificielle', 'IA et apprentissage automatique', 5)
       ON CONFLICT (slug) DO NOTHING
       RETURNING category_id`
    );
    console.log(`   Created ${categoriesResult.rowCount} categories`);

    const tagsResult = await client.query(
      `INSERT INTO tags (name, slug)
       VALUES
        ('JavaScript', 'javascript'),
        ('Python', 'python'),
        ('React', 'react'),
        ('Node.js', 'nodejs'),
        ('Machine Learning', 'machine-learning'),
        ('Tutoriel', 'tutoriel'),
        ('Débutant', 'debutant'),
        ('Avancé', 'avance')
       ON CONFLICT (slug) DO NOTHING
       RETURNING tag_id`
    );
    console.log(`   Created ${tagsResult.rowCount} tags`);

    const admin = await client.query(`SELECT user_id FROM users WHERE username = 'admin'`);
    const webDevCategory = await client.query(`SELECT category_id FROM categories WHERE slug = 'developpement-web'`);
    const dataCategory = await client.query(`SELECT category_id FROM categories WHERE slug = 'science-des-donnees'`);

    if (admin.rows.length && webDevCategory.rows.length) {
      const postsResult = await client.query(
        `INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, published_at, is_featured, reading_time)
         VALUES
          (
            'Bien démarrer avec React',
            'bien-demarrer-avec-react',
            '<h2>Introduction</h2><p>React est une bibliothèque JavaScript populaire pour construire des interfaces utilisateur modernes et réactives.</p><p>Dans cet article, nous explorons les concepts fondamentaux : composants, état, et props.</p>',
            'Découvrez les bases de React.js pour construire des applications web modernes.',
            $1, $2, 'published', CURRENT_TIMESTAMP, true, 8
          ),
          (
            'Python pour la science des données',
            'python-pour-la-science-des-donnees',
            '<h2>Pourquoi Python ?</h2><p>Python est devenu le langage de référence pour la science des données grâce à son écosystème riche : pandas, numpy, scikit-learn.</p>',
            'Comprendre pourquoi Python s''est imposé dans l''analyse de données.',
            $1, $3, 'published', CURRENT_TIMESTAMP, false, 12
          )
         ON CONFLICT (slug) DO NOTHING
         RETURNING post_id`,
        [admin.rows[0].user_id, webDevCategory.rows[0].category_id, dataCategory.rows[0]?.category_id || webDevCategory.rows[0].category_id]
      );
      console.log(`   Created ${postsResult.rowCount} posts`);
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully.');
    console.log('');
    console.log('   Demo accounts (password shown for local/dev use only):');
    console.log('   admin@educms.local   / Admin123!');
    console.log('   editor@educms.local  / Editor123!');
    console.log('   author@educms.local  / Author123!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
