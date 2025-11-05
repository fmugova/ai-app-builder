# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Stripe account (for payments)
- Anthropic API key (for AI generation)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual values:

#### Database Setup

Create a PostgreSQL database and add the connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ai_app_builder"
```

#### NextAuth Configuration

Generate a secure secret:

```bash
openssl rand -base64 32
```

Add it to your `.env`:

```env
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
```

#### Stripe Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your secret key (starts with `sk_test_` for testing)
3. Create products and prices for Pro and Enterprise plans
4. Get the price IDs from [Products page](https://dashboard.stripe.com/products)
5. Set up a webhook endpoint and get the webhook secret

```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

#### Anthropic API

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Add it to `.env`:

```env
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Set Up Database

Run Prisma migrations to create the database tables:

```bash
npx prisma migrate dev --name init
```

Or if you just want to push the schema without migrations:

```bash
npx prisma db push
```

Generate Prisma Client:

```bash
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### "Something went wrong" during signup

This usually means:
- Database is not properly configured or not running
- Environment variables are missing or incorrect
- Database migrations haven't been run

**Solution:**
1. Check your `DATABASE_URL` is correct
2. Ensure PostgreSQL is running
3. Run `npx prisma db push` to sync the schema
4. Check all required env vars are set

### "Invalid credentials" during signin

- Make sure you're using the correct email/password
- Check that the user was successfully created in the database

### Stripe webhook errors

- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- For local development, use Stripe CLI to forward webhooks:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

## Database Management

### View database in Prisma Studio

```bash
npx prisma studio
```

### Reset database

```bash
npx prisma migrate reset
```

### View current database schema

```bash
npx prisma db pull
```
