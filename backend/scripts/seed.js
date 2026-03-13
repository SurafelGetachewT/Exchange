const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create test user
    const testUserEmail = 'test@example.com';
    const testUserPassword = 'Test123!@#';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(testUserPassword, saltRounds);

    const userResult = await query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [testUserEmail, 'testuser', passwordHash, 'Test', 'User', true, true]
    );

    let userId;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log(`✅ Created test user: ${testUserEmail}`);
    } else {
      // Get existing test user
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [testUserEmail]);
      userId = existingUser.rows[0].id;
      console.log(`ℹ️  Using existing test user: ${testUserEmail}`);
    }

    // Create wallets for test user
    const currencies = ['BTC', 'ETH', 'USDT'];
    for (const currency of currencies) {
      await query(
        `INSERT INTO wallets (user_id, currency, balance)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, currency) DO UPDATE
         SET balance = EXCLUDED.balance`,
        [userId, currency, currency === 'USDT' ? 10000 : currency === 'BTC' ? 0.1 : 1.5]
      );
    }

    console.log('✅ Created wallets for test user');

    // Create sample orders
    await query(
      `INSERT INTO orders (user_id, type, side, symbol, amount, price, status, total_value, fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [userId, 'LIMIT', 'BUY', 'BTCUSDT', 0.001, 45000, 'OPEN', 45, 0.045]
    );

    await query(
      `INSERT INTO orders (user_id, type, side, symbol, amount, price, status, total_value, fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [userId, 'LIMIT', 'SELL', 'ETHUSDT', 0.1, 3000, 'OPEN', 300, 0.3]
    );

    console.log('✅ Created sample orders');

    console.log('🎉 Database seeding completed successfully!');
    console.log(`📧 Test user: ${testUserEmail}`);
    console.log(`🔑 Test password: ${testUserPassword}`);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
