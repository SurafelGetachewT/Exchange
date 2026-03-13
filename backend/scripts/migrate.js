const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Get executed migrations
    const executedResult = await query('SELECT filename FROM migrations');
    const executedMigrations = executedResult.rows.map(row => row.filename);
    
    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`📄 Running migration: ${file}`);
        
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file), 
          'utf8'
        );
        
        await query('BEGIN');
        try {
          await query(migrationSQL);
          await query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          await query('COMMIT');
          console.log(`✅ Migration ${file} completed successfully`);
        } catch (error) {
          await query('ROLLBACK');
          console.error(`❌ Migration ${file} failed:`, error);
          throw error;
        }
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
