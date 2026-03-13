-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('MARKET', 'LIMIT', 'STOP')),
    side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    symbol VARCHAR(20) NOT NULL, -- BTCUSDT, ETHUSDT, etc.
    amount DECIMAL(20,8) NOT NULL,
    price DECIMAL(20,8), -- NULL for market orders
    filled_amount DECIMAL(20,8) DEFAULT 0.00000000,
    remaining_amount DECIMAL(20,8) GENERATED ALWAYS AS (amount - filled_amount) STORED,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED')),
    total_value DECIMAL(20,8), -- amount * price
    fee DECIMAL(20,8) DEFAULT 0.00000000,
    fee_currency VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- Order expiration time
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_side ON orders(side);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE
    ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
