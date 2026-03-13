const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');

const router = express.Router();

// Get user orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, symbol, side } = req.query;
    
    let queryStr = `
      SELECT id, type, side, symbol, amount, price, filled_amount, remaining_amount,
             status, total_value, fee, fee_currency, created_at, updated_at
      FROM orders 
      WHERE user_id = $1
    `;
    const queryParams = [req.user.id];

    if (status) {
      queryStr += ' AND status = $' + (queryParams.length + 1);
      queryParams.push(status.toUpperCase());
    }

    if (symbol) {
      queryStr += ' AND symbol = $' + (queryParams.length + 1);
      queryParams.push(symbol.toUpperCase());
    }

    if (side) {
      queryStr += ' AND side = $' + (queryParams.length + 1);
      queryParams.push(side.toUpperCase());
    }

    queryStr += ' ORDER BY created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryStr, queryParams);

    res.json({ 
      orders: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get specific order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, type, side, symbol, amount, price, filled_amount, remaining_amount,
              status, total_value, fee, fee_currency, created_at, updated_at, expires_at
       FROM orders 
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Create new order
router.post('/', authenticateToken, validateOrder, async (req, res) => {
  try {
    const { type, side, symbol, amount, price } = req.body;

    // Start transaction
    await query('BEGIN');

    try {
      // Check if user has sufficient balance
      const currency = symbol.replace('USDT', '');
      const walletCurrency = side === 'BUY' ? 'USDT' : currency;

      // Ensure wallets exist (so users can trade any supported symbol)
      await query(
        'INSERT INTO wallets (user_id, currency) VALUES ($1, $2) ON CONFLICT (user_id, currency) DO NOTHING',
        [req.user.id, 'USDT']
      );
      await query(
        'INSERT INTO wallets (user_id, currency) VALUES ($1, $2) ON CONFLICT (user_id, currency) DO NOTHING',
        [req.user.id, currency]
      );

      const getMarketPrice = async () => {
        try {
          const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          if (!r.ok) return null;
          const data = await r.json();
          const p = Number(data.price);
          return Number.isFinite(p) && p > 0 ? p : null;
        } catch (_) {
          return null;
        }
      };

      if (type === 'MARKET') {
        const marketPrice = await getMarketPrice();
        if (!marketPrice) {
          await query('ROLLBACK');
          return res.status(503).json({ error: 'Market price unavailable' });
        }

        const totalValue = Number(amount) * marketPrice;
        const fee = totalValue * 0.001;

        const spendCurrency = side === 'BUY' ? 'USDT' : currency;
        const receiveCurrency = side === 'BUY' ? currency : 'USDT';

        const spendWalletRes = await query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
          [req.user.id, spendCurrency]
        );
        const receiveWalletRes = await query(
          'SELECT id, balance FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
          [req.user.id, receiveCurrency]
        );

        if (spendWalletRes.rows.length === 0 || receiveWalletRes.rows.length === 0) {
          await query('ROLLBACK');
          return res.status(400).json({ error: 'Wallet not found' });
        }

        const spendWallet = spendWalletRes.rows[0];
        const receiveWallet = receiveWalletRes.rows[0];
        const spendBefore = Number(spendWallet.balance);
        const receiveBefore = Number(receiveWallet.balance);

        const spendAmount = side === 'BUY' ? (totalValue + fee) : Number(amount);
        const receiveAmount = side === 'BUY' ? Number(amount) : (totalValue - fee);

        if (spendBefore < spendAmount) {
          await query('ROLLBACK');
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        const spendAfter = spendBefore - spendAmount;
        const receiveAfter = receiveBefore + receiveAmount;

        const orderResult = await query(
          `INSERT INTO orders (user_id, type, side, symbol, amount, price, filled_amount, status, total_value, fee, fee_currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, type, side, symbol, amount, price, filled_amount, remaining_amount,
                    status, total_value, fee, fee_currency, created_at`,
          [req.user.id, type, side, symbol, amount, marketPrice, amount, 'FILLED', totalValue, fee, 'USDT']
        );

        const newOrder = orderResult.rows[0];

        await query(
          'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [spendAfter, spendWallet.id]
        );
        await query(
          'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [receiveAfter, receiveWallet.id]
        );

        await query(
          `INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, status, description, order_id)
           VALUES ($1, 'TRADE', $2, $3, $4, $5, 'COMPLETED', $6, $7)`,
          [req.user.id, -spendAmount, spendCurrency, spendBefore, spendAfter, 'Market order spend', newOrder.id]
        );
        await query(
          `INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, status, description, order_id)
           VALUES ($1, 'TRADE', $2, $3, $4, $5, 'COMPLETED', $6, $7)`,
          [req.user.id, receiveAmount, receiveCurrency, receiveBefore, receiveAfter, 'Market order receive', newOrder.id]
        );

        await query('COMMIT');

        return res.status(201).json({
          message: 'Order filled successfully',
          order: newOrder
        });
      }

      const walletResult = await query(
        'SELECT balance FROM wallets WHERE user_id = $1 AND currency = $2',
        [req.user.id, walletCurrency]
      );

      if (walletResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Wallet not found' });
      }

      const availableBalance = parseFloat(walletResult.rows[0].balance);
      let requiredAmount;

      if (side === 'BUY') {
        requiredAmount = type === 'MARKET' ? amount * 50000 : amount * price; // Use market price estimate for market orders
      } else {
        requiredAmount = amount;
      }

      if (availableBalance < requiredAmount) {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Calculate total value and fee
      const totalValue = type === 'MARKET' ? null : amount * price;
      const fee = totalValue ? totalValue * 0.001 : 0; // 0.1% fee

      // Create order
      const orderResult = await query(
        `INSERT INTO orders (user_id, type, side, symbol, amount, price, total_value, fee, fee_currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, type, side, symbol, amount, price, filled_amount, remaining_amount,
                  status, total_value, fee, fee_currency, created_at`,
        [req.user.id, type, side, symbol, amount, price, totalValue, fee, walletCurrency]
      );

      const newOrder = orderResult.rows[0];

      // Lock funds in wallet
      await query(
        'UPDATE wallets SET balance = balance - $1, locked_balance = locked_balance + $1 WHERE user_id = $2 AND currency = $3',
        [requiredAmount, req.user.id, walletCurrency]
      );

      // Create transaction record
      await query(
        `INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, status, description, order_id)
         SELECT $1, 'TRADE', $2::numeric, $3::varchar, balance + $2::numeric, balance, 'PENDING', 'Order created', $4
         FROM wallets WHERE user_id = $1 AND currency = $3::varchar`,
        [req.user.id, requiredAmount, walletCurrency, newOrder.id]
      );

      await query('COMMIT');

      res.status(201).json({
        message: 'Order created successfully',
        order: newOrder
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Cancel order
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Start transaction
    await query('BEGIN');

    try {
      // Get order details
      const orderResult = await query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Order cannot be cancelled' });
      }

      // Calculate amount to unlock
      const currency = order.symbol.replace('USDT', '');
      const walletCurrency = order.side === 'BUY' ? 'USDT' : currency;
      const remainingAmount = parseFloat(order.remaining_amount);
      const price = order.price || 50000; // Use market price estimate for market orders
      const amountToUnlock = order.side === 'BUY' ? remainingAmount * price : remainingAmount;

      // Update order status
      await query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['CANCELLED', id]
      );

      // Unlock funds
      await query(
        'UPDATE wallets SET balance = balance + $1, locked_balance = locked_balance - $1 WHERE user_id = $2 AND currency = $3',
        [amountToUnlock, req.user.id, walletCurrency]
      );

      // Create transaction record
      await query(
        `INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, status, description, order_id)
         SELECT $1, 'TRADE', $2::numeric, $3::varchar, balance - $2::numeric, balance, 'COMPLETED', 'Order cancelled', $4
         FROM wallets WHERE user_id = $1 AND currency = $3::varchar`,
        [req.user.id, amountToUnlock, walletCurrency, id]
      );

      await query('COMMIT');

      res.json({
        message: 'Order cancelled successfully',
        orderId: id
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
