> **Interview Questions & Answers:** [Google Doc Link](https://docs.google.com/document/d/1VoeCUCyF2o2W7h20-AP6nxTpCxLd53Kz73GjPs4dYI4/edit?tab=t.0)

# Sycamore Backend Assessment

A robust Node.js/TypeScript backend service implementing an idempotent wallet transfer system and daily interest accumulator. Built with Sequelize (PostgreSQL), Redis for distributed locking, and comprehensive test coverage.

## 🚀 Features

### Part A: The Idempotent Wallet

- **Idempotent Transfers**: Double-tap protection using idempotency keys
- **Race Condition Prevention**: Distributed locking with Redis
- **PENDING State Logging**: Transaction logs created before balance changes
- **Double-Entry Bookkeeping**: Full ledger trail for audit compliance
- **Serializable Transactions**: Database-level isolation for consistency

### Part B: The Interest Accumulator

- **27.5% Per Annum Rate**: Configurable interest rate
- **Precise Math**: Uses Decimal.js to avoid floating-point errors
- **Leap Year Handling**: Correct day count for leap years (366 days)
- **Daily Accrual**: Records interest daily before applying to balance
- **Compound Interest**: Supports both simple and compound calculations

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/iyanuloluwa-Miracle/Sycamore_Backend_Assessment-.git
   cd sycamore-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Create database**
   ```bash
   # In PostgreSQL
   CREATE DATABASE sycamore_wallet;
   ```

5. **Run migrations**
   ```bash
   npm run migrate
   ```

6. **Seed test data (optional)**
   ```bash
   npm run seed
   ```

## 🚀 Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server starts on `http://localhost:3000` by default.

## � API Documentation

Interactive API documentation is available via Swagger UI:

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI JSON**: `http://localhost:3000/docs.json`

## �📚 API Endpoints

### Health Check
```
GET /api/health
```

### Transfer Endpoints

#### Execute Transfer
```
POST /api/transfer
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "fromWalletId": "uuid",
  "toWalletId": "uuid",
  "amount": 100.00,
  "description": "Payment for services"
}
```

#### Get Transaction by ID
```
GET /api/transfer/:transactionId
```

#### Get Transaction by Idempotency Key
```
GET /api/transfer/idempotency/:key
```

### Wallet Endpoints

#### Get Wallet Details
```
GET /api/wallets/:walletId
```

#### Get Wallet Balance
```
GET /api/wallets/:walletId/balance
```

#### Get Transaction History
```
GET /api/wallets/:walletId/history?limit=50&offset=0
```

#### Get Ledger Entries
```
GET /api/wallets/:walletId/ledger
```

### Interest Endpoints

#### Calculate Daily Interest (Preview)
```
POST /api/interest/calculate
Body:
{
  "principal": 100000,
  "date": "2024-02-29"
}
```

#### Calculate Interest for Period
```
POST /api/interest/calculate-period
Body:
{
  "principal": 100000,
  "days": 30,
  "startDate": "2024-01-01"
}
```

#### Simulate Compound Interest
```
POST /api/interest/simulate
Body:
{
  "principal": 100000,
  "days": 365,
  "startDate": "2024-01-01"
}
```

#### Accrue Interest for Wallet
```
POST /api/interest/accrue/:walletId
Body: { "date": "2024-01-01" }
```

#### Accrue Interest for All Wallets
```
POST /api/interest/accrue-all
Body: { "date": "2024-01-01" }
```

#### Apply Accrued Interest
```
POST /api/interest/apply
Body: { "walletId": "uuid", "date": "2024-01-01" }
```

#### Get Interest History
```
GET /api/interest/history/:walletId
```

#### Get Annual Projection
```
GET /api/interest/annual-projection?principal=100000&year=2024
```

## 🧪 Testing

**Run all tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

## 📁 Project Structure

```
sycamore-backend/
├── src/
│   ├── config/           # App and database configuration
│   │   ├── database.js   # Sequelize CLI config  
│   │   ├── index.ts      # Environment variables
│   │   └── swagger.ts    # OpenAPI specification
│   ├── controllers/      # HTTP request handlers
│   │   ├── index.ts      # Controller exports
│   │   ├── interest.controller.ts
│   │   ├── transfer.controller.ts
│   │   └── wallet.controller.ts
│   ├── database/
│   │   ├── connection.ts # Sequelize connection
│   │   ├── migrations/   # Database migrations
│   │   └── seeders/      # Seed data
│   ├── middleware/       # Express middleware
│   │   ├── async.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── index.ts
│   │   └── validation.middleware.ts
│   ├── models/           # Sequelize models
│   │   ├── index.ts
│   │   ├── Wallet.ts
│   │   ├── TransactionLog.ts
│   │   ├── LedgerEntry.ts
│   │   └── InterestAccrual.ts
│   ├── routes/           # API route definitions
│   │   ├── index.ts
│   │   ├── transfer.routes.ts
│   │   ├── wallet.routes.ts
│   │   └── interest.routes.ts
│   ├── services/         # Business logic layer
│   │   ├── index.ts
│   │   ├── transfer.service.ts
│   │   ├── interest.service.ts
│   │   └── wallet.service.ts
│   ├── tests/            # Jest test suites
│   │   ├── financial-math.test.ts
│   │   ├── interest.service.test.ts
│   │   └── transfer.service.test.ts
│   ├── utils/            # Shared utilities
│   │   ├── financial-math.ts
│   │   └── redis.ts
│   └── server.ts         # Express application entry point
├── .env.example          # Environment template
├── jest.config.js        # Jest configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Key Design Decisions

### 1. Race Condition Prevention

The transfer service implements multiple layers of protection:

1. **Idempotency Keys**: Client-provided keys cached in Redis (24h TTL)
2. **Distributed Locking**: Redis-based locks on wallet pairs
3. **Serializable Isolation**: PostgreSQL SERIALIZABLE transactions
4. **Row-Level Locking**: SELECT FOR UPDATE on wallet rows

### 2. PENDING State Pattern

Every transfer follows this flow:
1. Create TransactionLog with `PENDING` status
2. Lock both wallets with FOR UPDATE
3. Validate balances
4. Update balances
5. Create ledger entries
6. Update TransactionLog to `COMPLETED`

If any step fails, the transaction remains `PENDING` or is marked `FAILED`.

### 3. Mathematical Precision

All monetary calculations use `Decimal.js`:
- 20 decimal precision for intermediate calculations
- 4 decimal places for stored values
- ROUND_HALF_UP for financial rounding
- No floating-point JavaScript numbers in calculations

### 4. Leap Year Handling

Interest calculations correctly handle:
- Regular years: 365 days
- Leap years: 366 days (divisible by 4, not 100, or divisible by 400)
- Year boundaries: Day count based on actual date

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | sycamore_wallet |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `ANNUAL_INTEREST_RATE` | Interest rate (decimal) | 0.275 |

## 📊 Database Schema

### wallets
- `id` (UUID, PK)
- `user_id` (UUID, unique)
- `balance` (DECIMAL 20,4)
- `currency` (VARCHAR 3)
- `is_active` (BOOLEAN)

### transaction_logs
- `id` (UUID, PK)
- `idempotency_key` (VARCHAR, unique)
- `from_wallet_id` (UUID, FK)
- `to_wallet_id` (UUID, FK)
- `amount` (DECIMAL 20,4)
- `type` (ENUM: TRANSFER, DEPOSIT, WITHDRAWAL, INTEREST)
- `status` (ENUM: PENDING, COMPLETED, FAILED, REVERSED)

### ledger_entries
- `id` (UUID, PK)
- `transaction_log_id` (UUID, FK)
- `wallet_id` (UUID, FK)
- `entry_type` (ENUM: DEBIT, CREDIT)
- `balance_before` (DECIMAL 20,4)
- `balance_after` (DECIMAL 20,4)

### interest_accruals
- `id` (UUID, PK)
- `wallet_id` (UUID, FK)
- `principal_amount` (DECIMAL 20,4)
- `interest_amount` (DECIMAL 20,4)
- `annual_rate` (DECIMAL 10,6)
- `daily_rate` (DECIMAL 20,10)
- `accrual_date` (DATE)
- `is_applied` (BOOLEAN)

## 🏗️ Architecture

The codebase follows a Controller → Service → Route pattern:

- **Controllers** handle HTTP concerns (parsing requests, formatting responses)
- **Services** encapsulate business logic and database operations  
- **Routes** define endpoints and wire up middleware

```
Request → Route → Middleware → Controller → Service → Database
```

### Key Design Decisions

1. **Service Layer Pattern**: Business logic separated from HTTP handling
2. **Repository Pattern**: Database access through Sequelize models
3. **Middleware Chain**: Validation and error handling as composable middleware
4. **Singleton Services**: Single instance for stateless services
5. **Event Sourcing Ready**: Full transaction logs enable replay and audit

## 📝 License

ISC

## 👤 Author

Sycamore Backend Assessment
