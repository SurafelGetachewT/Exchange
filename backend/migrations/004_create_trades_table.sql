-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    buy_order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sell_order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    total_value DECIMAL(20,8) GENERATED ALWAYS AS (amount * price) STORED,
    buy_fee DECIMAL(20,8) DEFAULT 0.00000000,
    sell_fee DECIMAL(20,8) DEFAULT 0.00000000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trades_buy_order_id ON trades(buy_order_id);
CREATE INDEX IF NOT EXISTS idx_trades_sell_order_id ON trades(sell_order_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
