-- Spaceshiba DB schema. Balances are tracked in the token's smallest
-- unit (NUMERIC(20,0)) so there is no floating-point loss for on-chain
-- amounts. The game always converts to UI amount = raw / 10^decimals
-- at the edges.
--
-- Safe to re-run: all statements use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS balances (
    wallet      TEXT          PRIMARY KEY,
    amount      NUMERIC(24,0) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Each confirmed on-chain deposit is recorded exactly once. signature is
-- the transaction signature — natural primary key, gives us idempotency.
CREATE TABLE IF NOT EXISTS deposits (
    signature    TEXT          PRIMARY KEY,
    wallet       TEXT          NOT NULL,
    amount       NUMERIC(24,0) NOT NULL,
    slot         BIGINT,
    seen_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet);

-- Withdrawals progress through pending → sent → confirmed (or failed).
-- Balance is debited atomically at pending; on failure we refund.
CREATE TABLE IF NOT EXISTS withdrawals (
    id            UUID          PRIMARY KEY,
    wallet        TEXT          NOT NULL,
    amount        NUMERIC(24,0) NOT NULL,
    signature     TEXT,
    status        TEXT          NOT NULL
                   CHECK (status IN ('pending','sent','confirmed','failed')),
    failure_reason TEXT,
    requested_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawals(wallet);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- A single row that tracks the last deposit signature we processed, so
-- the watcher can resume without rescanning history.
CREATE TABLE IF NOT EXISTS watcher_cursor (
    id              INT  PRIMARY KEY DEFAULT 1,
    last_signature  TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (id = 1)
);
INSERT INTO watcher_cursor (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Hash-chained server seeds. The chain is generated at first boot: a
-- random 32-byte terminal seed is fixed, and chain[i] = sha256(chain[i+1])
-- all the way down to chain[0] = head_hash, which is published. Each
-- round uses chain[nonce] as its server seed, revealed after crash. A
-- player can verify at any time that sha256(revealed_seed_N) equals the
-- previous round's revealed seed (or head_hash for nonce=1), proving the
-- server cannot have picked seeds after observing bets.
CREATE TABLE IF NOT EXISTS seed_chain (
    id             INT  PRIMARY KEY DEFAULT 1,
    terminal_seed  TEXT NOT NULL,
    head_hash      TEXT NOT NULL,
    chain_length   INT  NOT NULL,
    last_nonce     INT  NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (id = 1)
);
