# Cryptocurrency Exchange Backend

A secure, scalable backend for a cryptocurrency exchange platform built with Node.js and PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Secure Password Management**: bcrypt hashing with salt rounds
- **Wallet Management**: Multi-currency wallet support
- **Order Management**: Market, limit, and stop orders
- **Transaction History**: Complete audit trail
- **Security**: Rate limiting, CORS, helmet security headers
- **Validation**: Comprehensive input validation
- **Database Migrations**: Version-controlled schema updates

## Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secrets
   ```

3. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE crypto_exchange;
   CREATE USER your_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE crypto_exchange TO your_user;
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `GET /api/users/stats` - Get user statistics

### Wallets
- `GET /api/wallets` - Get all user wallets
- `GET /api/wallets/:currency` - Get specific wallet
- `GET /api/wallets/:currency/transactions` - Get wallet transactions
- `POST /api/wallets/:currency/address` - Create deposit address

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get specific order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/cancel` - Cancel order

## Database Schema

### Tables
- **users**: User accounts and authentication
- **wallets**: User cryptocurrency wallets
- **orders**: Trading orders
- **trades**: Executed trades
- **transactions**: Transaction history

### Security Features

- **JWT Authentication**: Access and refresh tokens
- **Password Security**: bcrypt with 12 salt rounds
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configurable cross-origin policies

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_exchange
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_REFRESH_EXPIRE=7d

# CORS
FRONTEND_URL=http://localhost:5500

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

## Security Considerations

1. **Always use HTTPS in production**
2. **Keep JWT secrets secure and rotate regularly**
3. **Use strong database passwords**
4. **Implement proper logging and monitoring**
5. **Regular security audits and updates**

## Next Steps

1. Implement WebSocket for real-time updates
2. Add email verification system
3. Implement 2FA authentication
4. Add comprehensive logging
5. Set up monitoring and alerting
6. Implement order matching engine
7. Add API documentation (Swagger)

## License

MIT
