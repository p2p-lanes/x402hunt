-- Add tx_hash and payer_address columns to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS payer_address TEXT;
