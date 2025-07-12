const RYE_API_KEY = process.env.RYE_API_KEY;
const RYE_BASE_URL = process.env.RYE_BASE_URL;

// GET endpoint to poll checkout intent status
export async function GET(req: NextRequest) {
  try {
    console.log('[GET] Incoming request:', req.url);
    const { searchParams } = new URL(req.url);
    const checkoutIntentId = searchParams.get('checkoutIntentId');
    console.log('[GET] Extracted checkoutIntentId:', checkoutIntentId);
    if (!checkoutIntentId) {
      console.log('[GET] Missing checkoutIntentId');
      return NextResponse.json({ error: 'Missing checkoutIntentId' }, { status: 400 });
    }
    // Call Rye API to get checkout intent status
    const { json: intent, ryeTraceId } = await callRyeAPI(`checkout-intents/${checkoutIntentId}`, 'GET');
    console.log('[GET] Rye API response:', intent);
    const response = NextResponse.json(intent);

    if (ryeTraceId) 
      response.headers.set('rye-trace-id', "CI GET " + ryeTraceId);

    return response;
  } catch (err) {
    const error = err as Error & { ryeTraceId?: string };
    console.error('[GET] Error:', error.message);
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    if (error.ryeTraceId) 
      response.headers.set('rye-trace-id', "CI GET ERROR " + error.ryeTraceId);

    return response;
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
  console.log('[callRyeAPI] endpoint:', endpoint, 'method:', method, 'body:', body);
  if (!RYE_API_KEY) {
    console.error('[callRyeAPI] Missing RYE_API_KEY in environment variables');
    throw new Error('Missing RYE_API_KEY in environment variables');
  }
  const res = await fetch(`${RYE_BASE_URL}/api/v1/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${RYE_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  console.log('[callRyeAPI] Response status:', res.status);
  const ryeTraceId = res.headers.get('rye-trace-id') || '';
  if (!res.ok) {
    const error = await res.text();
    console.error('[callRyeAPI] Error response:', error);
    // Attach trace id to error for forwarding
    throw Object.assign(new Error(error), { ryeTraceId });
  }
  const json = await res.json();
  console.log('[callRyeAPI] Response JSON:', json);
  return { json, ryeTraceId };
}

export async function POST(req: NextRequest) {
  try {
    const data: {
      productUrl?: string;
      quantity?: number;
      buyer?: Buyer;
      confirm?: boolean;
      checkoutIntentId?: string;
      paymentMethod?: { stripe_token: string; type: string };
    } = await req.json();
    const { productUrl, confirm, checkoutIntentId, buyer, paymentMethod } = data;

    // Step 1: Create checkout intent and get cost
    if (!confirm) {
      console.log('[POST] Creating checkout intent with:', { productUrl, buyer });
      // Create checkout intent
      const { json: checkoutIntent, ryeTraceId } = await callRyeAPI('checkout-intents', 'POST', {
        productUrl,
        buyer,
      });
      console.log('[POST] Checkout intent created:', checkoutIntent);
      // Get cost
      const cost = checkoutIntent?.cost || checkoutIntent?.items?.[0]?.cost;
      console.log('[POST] Checkout intent cost:', cost, 'CheckoutIntent ID:', checkoutIntent.id);
      const response = NextResponse.json({ cost, checkoutIntentId: checkoutIntent.id });
      if (ryeTraceId) 
        response.headers.set('rye-trace-id', "CI POST " + ryeTraceId);
      return response;
    }

    // Step 2: Perform checkout with Stripe token
    if (confirm && checkoutIntentId && paymentMethod) {
      console.log('[POST] Confirming checkout for checkoutIntentId:', checkoutIntentId, 'with paymentMethod:', paymentMethod);
      // Confirm checkout intent with Stripe token
      const { json: checkout, ryeTraceId } = await callRyeAPI(`checkout-intents/${checkoutIntentId}/confirm`, 'POST', {
        paymentMethod,
      });
      console.log('[POST] Checkout response:', checkout);
      const response = NextResponse.json({ success: true, checkoutIntent: checkout });
      if (ryeTraceId) 
        response.headers.set('rye-trace-id', "CI POST CONFIRM " + ryeTraceId);
      return response;
    }

    console.log('[POST] Invalid request:', data);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    const error = err as Error & { ryeTraceId?: string };
    console.error('[POST] Error:', error.message);
    const response = NextResponse.json({ error: error.message }, { status: 500 });
    if (error.ryeTraceId) 
      response.headers.set('rye-trace-id', "CI POST ERROR " + error.ryeTraceId);
    return response;
  }
} 