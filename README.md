# Rye API Checkout Demo

This is a [Next.js](https://nextjs.org) app demonstrating a simple multi-step checkout flow using the [Rye API](https://rye.com) and Stripe for payments.

## App Walkthrough

1. **Enter Product Details:**
   - Input a product URL, quantity, and buyer information (name, email, address, etc.).
2. **Offer Status:**
   - The app polls for the checkout intent information until the checkout information is ready for confirmation.
3. **Get Cost Estimate:**
   - The app creates a checkout intent with Rye and displays the total cost.
4. **Payment:**
   - Enter your card details (powered by Stripe) and confirm payment.
5. **Checkout Intent Status:**
   - The app polls for the checkout intent status and displays the final result (success or failure).

Also included is a simple standalone Stripe token generator for credit cards (scoped to Rye's Stripe account), in case you would like to plug the token value into curl or postman calls. Tokens are single-use.

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a `.env` File

Copy the `.env.example` and then set your Rye API keys:

```bash
cp .env.example .env
```

> **Note:** You must obtain a Rye API key from [Rye - Staging](https://staging.console.rye.com) or [Rye - Prod](https://console.rye.com) to use this app.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to use the app.

To use the token generator, open [http://localhost:3000/stripe](http://localhost:3000/stripe). In staging, you may use Stripe test cards, e.g. `4242 4242 4242 4242`, with any future expiration, and any cvc/zip.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Rye API Documentation](https://rye.com/docs)
