const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validatePasswordChange } = require('../middleware/validation');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, username, first_name, last_name, phone, is_verified, 
              is_active, created_at, last_login
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        isVerified: user.is_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const result = await query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name), 
           phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, username, first_name, last_name, phone, updated_at`,
      [firstName, lastName, phone, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get wallet balances
    const walletsResult = await query(
      'SELECT currency, balance, locked_balance FROM wallets WHERE user_id = $1',
      [req.user.id]
    );

    // Get total trades count
    const tradesResult = await query(
      `SELECT COUNT(*) as total_trades,
              SUM(CASE WHEN buy_order_id IN (SELECT id FROM orders WHERE user_id = $1) THEN 1 ELSE 0 END) as buy_trades,
              SUM(CASE WHEN sell_order_id IN (SELECT id FROM orders WHERE user_id = $1) THEN 1 ELSE 0 END) as sell_trades
       FROM trades
       WHERE buy_order_id IN (SELECT id FROM orders WHERE user_id = $1) 
          OR sell_order_id IN (SELECT id FROM orders WHERE user_id = $1)`,
      [req.user.id]
    );

    // Get total transaction volume
    const volumeResult = await query(
      `SELECT SUM(amount) as total_volume
       FROM transactions 
       WHERE user_id = $1 AND type = 'TRADE' AND status = 'COMPLETED'`,
      [req.user.id]
    );

    const stats = {
      wallets: walletsResult.rows,
      totalTrades: parseInt(tradesResult.rows[0].total_trades) || 0,
      buyTrades: parseInt(tradesResult.rows[0].buy_trades) || 0,
      sellTrades: parseInt(tradesResult.rows[0].sell_trades) || 0,
      totalVolume: parseFloat(volumeResult.rows[0].total_volume) || 0
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

module.exports = router;
