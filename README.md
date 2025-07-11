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

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a `.env` File

Create a `.env` file in the root of your project with the following variables:

```env
# Your Rye API key (required)
RYE_API_KEY=your_rye_api_key_here

# The base URL for the Rye API (required)
RYE_BASE_URL=https://api.rye.com
# use https://staging.api.rye.com to use for staging environment.

# Stripe API Key (required)
NEXT_PUBLIC_STRIPE_API_KEY=pk_live_51LgDhrHGDlstla3fOYU3AUV6QpuOgVEUa1E1VxFnejJ7mWB4vwU7gzSulOsWQ3Q90VVSk1WWBzYBo0RBKY3qxIjV00LHualegh
# use `pk_test_51LgDhrHGDlstla3fdqlULAne0rAf4Ho6aBV2cobkYQ4m863Sy0W8DNu2HOnUeYTQzQnE4DZGyzvCB8Yzl1r38isl00H9sVKEMu` instead for staging environment
```

> **Note:** You must obtain a Rye API key from [Rye](https://console.rye.com) to use this app.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to use the app.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Rye API Documentation](https://rye.com/docs)
