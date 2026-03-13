const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/deposit', authenticateToken, async (req, res) => {
  try {
    const currency = (req.body.currency || 'USDT').toUpperCase();
    const amount = req.body.amount === undefined ? 1000 : Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    if (amount > 1000000) {
      return res.status(400).json({ error: 'Amount too large' });
    }

    await query('BEGIN');

    try {
      await query(
        'INSERT INTO wallets (user_id, currency) VALUES ($1, $2) ON CONFLICT (user_id, currency) DO NOTHING',
        [req.user.id, currency]
      );

      const walletRes = await query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
        [req.user.id, currency]
      );

      if (walletRes.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Wallet not found' });
      }

      const wallet = walletRes.rows[0];
      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      await query(
        'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [amount, wallet.id]
      );

      const txRes = await query(
        `INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, status, description)
         VALUES ($1, 'DEPOSIT', $2, $3, $4, $5, 'COMPLETED', $6)
         RETURNING id, type, amount, currency, balance_before, balance_after, status, created_at`,
        [req.user.id, amount, currency, balanceBefore, balanceAfter, 'Demo deposit']
      );

      await query('COMMIT');

      return res.json({
        message: 'Deposit successful',
        wallet: {
          currency,
          balanceBefore,
          balanceAfter
        },
        transaction: txRes.rows[0]
      });
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  } catch (error) {
    console.error('Deposit error:', error);
    return res.status(500).json({ error: 'Failed to deposit' });
  }
});

// Get all user wallets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, currency, balance, locked_balance, address, is_active, created_at, updated_at
       FROM wallets 
       WHERE user_id = $1 
       ORDER BY currency`,
      [req.user.id]
    );

    res.json({ wallets: result.rows });
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Failed to get wallets' });
  }
});

// Get specific wallet
router.get('/:currency', authenticateToken, async (req, res) => {
  try {
    const { currency } = req.params;

    const result = await query(
      `SELECT id, currency, balance, locked_balance, address, is_active, created_at, updated_at
       FROM wallets 
       WHERE user_id = $1 AND currency = UPPER($2)`,
      [req.user.id, currency]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ wallet: result.rows[0] });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

// Get wallet transaction history
router.get('/:currency/transactions', authenticateToken, async (req, res) => {
  try {
    const { currency } = req.params;
    const { limit = 50, offset = 0, type } = req.query;

    let queryStr = `
      SELECT id, type, amount, currency, balance_before, balance_after, 
             status, description, reference_id, created_at
      FROM transactions 
      WHERE user_id = $1 AND currency = UPPER($2)
    `;
    const queryParams = [req.user.id, currency];

    if (type) {
      queryStr += ' AND type = $3';
      queryParams.push(type.toUpperCase());
    }

    queryStr += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryStr, queryParams);

    res.json({ 
      transactions: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Create deposit address (mock implementation)
router.post('/:currency/address', authenticateToken, async (req, res) => {
  try {
    const { currency } = req.params;

    // Check if wallet exists
    const walletResult = await query(
      'SELECT id FROM wallets WHERE user_id = $1 AND currency = UPPER($2)',
      [req.user.id, currency]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Generate mock deposit address (in production, integrate with blockchain)
    const mockAddress = `${currency.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}_deposit`;

    // Update wallet with deposit address
    await query(
      'UPDATE wallets SET address = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND currency = UPPER($3)',
      [mockAddress, req.user.id, currency]
    );

    res.json({
      message: 'Deposit address generated',
      address: mockAddress,
      currency: currency.toUpperCase()
    });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to create deposit address' });
  }
});

module.exports = router;
