/**
 * Migration runner — executes schema.sql against the configured database.
 * Usage: npm run migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const runMigration = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('🔧 Running database migration...');
  try {
    await pool.query(schema);
    console.log('✅ Migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();
