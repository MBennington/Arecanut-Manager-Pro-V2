# Arecanut Manager Pro - Backend

Express.js backend with MongoDB for Arecanut Manager Pro.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment (create `.env` file):
```
MONGODB_URI=mongodb://localhost:27017/arecanut_manager
PORT=5000
NODE_ENV=development
```

3. Start MongoDB (if local):
```bash
mongod
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | Get all transactions |
| GET | /api/transactions/:id | Get single transaction |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |
| DELETE | /api/transactions | Delete all transactions |
| GET | /api/transactions/stats | Get dashboard stats |
| GET | /api/transactions/analytics/:type | Get market analytics |
| GET | /api/health | Health check |

## Transaction Types

- **BUY** - Purchase raw arecanut
- **SELL** - Sell processed kernel
- **PROCESS** - Convert raw to kernel
- **EXPENSE** - Record expenses
- **LOAN** - Take or repay loans
