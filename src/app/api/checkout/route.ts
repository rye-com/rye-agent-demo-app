// GET endpoint to poll checkout intent status
export async function GET(req: NextRequest) {
  try {
    console.log('[GET] Incoming request:', req.url);
    const { searchParams } = new URL(req.url);
    const cartId = searchParams.get('cartId');
    console.log('[GET] Extracted cartId:', cartId);
    if (!cartId) {
      console.log('[GET] Missing cartId');
      return NextResponse.json({ error: 'Missing cartId' }, { status: 400 });
    }
    // Call Rye API to get checkout intent status
    const intent = await callRyeAPI(`checkout-intents/${cartId}`, 'GET');
    console.log('[GET] Rye API response:', intent);
    return NextResponse.json(intent);
  } catch (err) {
    const error = err as Error;
    console.error('[GET] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';

// Type for buyer information
type Buyer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
};

// Helper to call Rye API
async function callRyeAPI(endpoint: string, method: string, body?: Record<string, unknown>) {
  const apiKey = process.env.RYE_API_KEY;
  console.log('[callRyeAPI] endpoint:', endpoint, 'method:', method, 'body:', body);
  if (!apiKey) {
    console.error('[callRyeAPI] Missing RYE_API_KEY in environment variables');
    throw new Error('Missing RYE_API_KEY in environment variables');
  }
  const res = await fetch(`https://api.rye.com/api/v1/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  console.log('[callRyeAPI] Response status:', res.status);
  if (!res.ok) {
    const error = await res.text();
    console.error('[callRyeAPI] Error response:', error);
    throw new Error(error);
  }
  const json = await res.json();
  console.log('[callRyeAPI] Response JSON:', json);
  return json;
}

export async function POST(req: NextRequest) {
  try {
    const data: {
      productUrl?: string;
      quantity?: number;
      buyer?: Buyer;
      confirm?: boolean;
      cartId?: string;
      paymentMethod?: { stripe_token: string; type: string };
    } = await req.json();
    const { productUrl, confirm, cartId, buyer, paymentMethod } = data;

    // Step 1: Create cart and get cost
    if (!confirm) {
      console.log('[POST] Creating cart with:', { productUrl, buyer });
      // Create cart
      const cart = await callRyeAPI('checkout-intents', 'POST', {
        productUrl,
        buyer,
      });
      console.log('[POST] Cart created:', cart);
      // Get cost
      const cost = cart?.cost || cart?.items?.[0]?.cost;
      console.log('[POST] Cart cost:', cost, 'Cart ID:', cart.id);
      return NextResponse.json({ cost, cartId: cart.id });
    }

    // Step 2: Perform checkout with Stripe token
    if (confirm && cartId && paymentMethod) {
      console.log('[POST] Confirming checkout for cartId:', cartId, 'with paymentMethod:', paymentMethod);
      // Confirm checkout intent with Stripe token
      const checkout = await callRyeAPI(`checkout-intents/${cartId}/confirm`, 'POST', {
        paymentMethod,
      });
      console.log('[POST] Checkout response:', checkout);
      return NextResponse.json({ success: true, order: checkout });
    }

    console.log('[POST] Invalid request:', data);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    const error = err as Error;
    console.error('[POST] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 