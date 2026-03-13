-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(20) NOT NULL, -- BTC, ETH, USDT, etc.
    balance DECIMAL(20,8) DEFAULT 0.00000000,
    locked_balance DECIMAL(20,8) DEFAULT 0.00000000, -- For pending orders
    address VARCHAR(255), -- Blockchain address for deposits
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, currency)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);

-- Create trigger for updated_at
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE
    ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
