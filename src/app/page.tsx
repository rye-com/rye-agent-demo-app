"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_live_51LgDhrHGDlstla3fOYU3AUV6QpuOgVEUa1E1VxFnejJ7mWB4vwU7gzSulOsWQ3Q90VVSk1WWBzYBo0RBKY3qxIjV00LHualegh");

// Helper to poll checkout intent status
// We poll every 5 seconds for up to 2 minutes to check for state changes
const pollCheckoutIntent = async (checkoutIntentId: string, desiredStates: string[], timeout = 120000, interval = 5000) => {
  const start = Date.now();
  let lastData = null;
  console.log("Polling for checkout intent", { checkoutIntentId, desiredStates, timeout, interval });
  while (Date.now() - start < timeout) {
    const res = await fetch(`/api/checkout?checkoutIntentId=${checkoutIntentId}`);
    const data = await res.json();
    lastData = data;
    console.log("Poll: Got data", data);
    if (data.state && desiredStates.includes(data.state)) {
      console.log("Poll: Desired state reached", data.state);
      return data;
    }
    await new Promise(r => setTimeout(r, interval));
  }
  console.log("Poll: Timeout reached", { lastData });
  throw new Error(`Timeout waiting for state: ${desiredStates.join(", ")}`);
};

function CheckoutForm({ cost, checkoutIntentId, onBack, onSuccess }: { cost: { currencyCode: string; amountSubunits: number }, checkoutIntentId: string, onBack: () => void, onSuccess: (checkoutIntent: unknown) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!stripe || !elements) {
      console.log("Stripe or Elements not loaded");
      return;
    }
    setLoading(true);
    console.log("CheckoutForm: Submitting payment...");
    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");
      console.log("CheckoutForm: Creating Stripe token...");
      const { token, error: stripeError } = await stripe.createToken(card);
      if (stripeError || !token) {
        console.log("CheckoutForm: Stripe tokenization failed", stripeError);
        throw new Error(stripeError?.message || "Stripe tokenization failed");
      }
      console.log("CheckoutForm: Stripe token created", token.id);
      // Send token to backend
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutIntentId,
          confirm: true,
          paymentMethod: {
            stripe_token: token.id,
            type: "stripe_token"
          }
        }),
      });
      console.log("CheckoutForm: Sent token to backend, waiting for response...");
      const data = await res.json();
      console.log("CheckoutForm: Backend response", data);
      if (!res.ok) throw new Error(data.error || "Checkout submission failed");

      const checkoutIntentObject = await pollCheckoutIntent(data.checkoutIntent.id, ["completed", "failed"]);
      onSuccess(checkoutIntentObject);
    } catch (err: unknown) {
      console.log("CheckoutForm: Error occurred", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      console.log("CheckoutForm: Done processing payment");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="mb-2">
        <div className="font-medium">Total Cost:</div>
        <div className="text-lg font-mono">{cost.currencyCode} {cost.amountSubunits/100}</div>
      </div>
      <label className="font-medium">Card Details</label>
      <div className="border rounded px-3 py-2 bg-white">
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#32325d' } } }} />
      </div>
      <button
        type="submit"
        className="bg-black text-white rounded px-4 py-2 mt-2 hover:bg-gray-800 disabled:opacity-50"
        disabled={loading || !stripe}
      >
        {loading ? "Processing..." : "Confirm & Pay"}
      </button>
      <button
        type="button"
        className="text-gray-500 underline text-sm mt-1"
        onClick={() => {
          console.log("CheckoutForm: Back button clicked");
          onBack();
        }}
        disabled={loading}
      >
        Back
      </button>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </form>
  );
}

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [productUrl, setProductUrl] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buyer, setBuyer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    country: "US",
    postalCode: "",
  });
  const [cost, setCost] = useState<{ currency: string; total: string } | null>(null);
  const [checkoutIntentId, setCheckoutIntentId] = useState<string>("");
  const [showCheckoutIntentId, setShowCheckoutIntentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id?: string, state?: string } | null>(null);
  const [polling, setPolling] = useState(false);

  // Step 1: Get cost and poll for awaiting_confirmation
  const handleGetCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setPolling(false);
    console.log("handleGetCost: Submitting product info", { productUrl, quantity, buyer });
    try {
      // Step 1: Submit to backend to create checkout intent
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, quantity, buyer }),
      });
      const data = await res.json();
      console.log("handleGetCost: Backend response", data);
      if (!res.ok) throw new Error(data.error || "Failed to get cost");
      setCheckoutIntentId(data.checkoutIntentId);
      setShowCheckoutIntentId(data.checkoutIntentId); // Always show as soon as generated
      setPolling(true);
      // Step 2: Poll for awaiting_confirmation
      const pollData = await pollCheckoutIntent(data.checkoutIntentId, ["awaiting_confirmation"]);
      setPolling(false);
      setCost(pollData.offer.cost);
      console.log("handleGetCost: Cost data", pollData.offer.cost);
      setStep(2);
    } catch (err: unknown) {
      console.log("handleGetCost: Error occurred", err);
      setError(err instanceof Error ? err.message : String(err));
      setPolling(false);
    } finally {
      setLoading(false);
      console.log("handleGetCost: Done");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Simple Checkout Demo</h1>
        {step === 1 && (
          <form onSubmit={handleGetCost} className="flex flex-col gap-4">
            <label className="font-medium">Product URL</label>
            <input
              type="url"
              required
              className="border rounded px-3 py-2"
              placeholder="https://..."
              value={productUrl}
              onChange={e => {
                console.log("Product URL changed", e.target.value);
                setProductUrl(e.target.value);
              }}
            />
            <label className="font-medium">Quantity</label>
            <input
              type="number"
              min={1}
              className="border rounded px-3 py-2"
              value={quantity}
              onChange={e => {
                console.log("Quantity changed", e.target.value);
                setQuantity(Number(e.target.value));
              }}
            />
            <div className="font-medium mt-2">Buyer Information</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                className="border rounded px-3 py-2 col-span-1"
                placeholder="First Name"
                value={buyer.firstName}
                onChange={e => {
                  console.log("Buyer firstName changed", e.target.value);
                  setBuyer(b => ({ ...b, firstName: e.target.value }));
                }}
              />
              <input
                type="text"
                required
                className="border rounded px-3 py-2 col-span-1"
                placeholder="Last Name"
                value={buyer.lastName}
                onChange={e => {
                  console.log("Buyer lastName changed", e.target.value);
                  setBuyer(b => ({ ...b, lastName: e.target.value }));
                }}
              />
            </div>
            <input
              type="email"
              required
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={buyer.email}
              onChange={e => {
                console.log("Buyer email changed", e.target.value);
                setBuyer(b => ({ ...b, email: e.target.value }));
              }}
            />
            <input
              type="tel"
              required
              className="border rounded px-3 py-2"
              placeholder="Phone"
              value={buyer.phone}
              onChange={e => {
                console.log("Buyer phone changed", e.target.value);
                setBuyer(b => ({ ...b, phone: e.target.value }));
              }}
            />
            <input
              type="text"
              required
              className="border rounded px-3 py-2"
              placeholder="Address 1"
              value={buyer.address1}
              onChange={e => {
                console.log("Buyer address1 changed", e.target.value);
                setBuyer(b => ({ ...b, address1: e.target.value }));
              }}
            />
            <input
              type="text"
              className="border rounded px-3 py-2"
              placeholder="Address 2 (optional)"
              value={buyer.address2}
              onChange={e => {
                console.log("Buyer address2 changed", e.target.value);
                setBuyer(b => ({ ...b, address2: e.target.value }));
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
              type="text"
              required
              className="border rounded px-3 py-2 col-span-1"
              placeholder="City"
              value={buyer.city}
              onChange={e => {
                console.log("Buyer city changed", e.target.value);
                setBuyer(b => ({ ...b, city: e.target.value }));
              }}
              />
              <input
              type="text"
              required
              minLength={2}
              maxLength={2}
              pattern="[A-Za-z]{2}"
              className="border rounded px-3 py-2 col-span-1"
              placeholder="Province/State Code (eg. CA, NY)"
              value={buyer.province}
              onChange={e => {
                // Only allow 2 characters, uppercase
                const val = e.target.value.toUpperCase().slice(0, 2);
                console.log("Buyer province changed", val);
                setBuyer(b => ({ ...b, province: val }));
              }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
              type="text"
              required
              minLength={2}
              maxLength={2}
              pattern="[A-Za-z]{2}"
              className="border rounded px-3 py-2 col-span-1"
              placeholder="Country Code (eg. US, CA)"
              value={buyer.country}
              onChange={e => {
                // Only allow 2 characters, uppercase
                const val = e.target.value.toUpperCase().slice(0, 2);
                console.log("Buyer country changed", val);
                setBuyer(b => ({ ...b, country: val }));
              }}
              />
              <input
              type="text"
              required
              className="border rounded px-3 py-2 col-span-1"
              placeholder="Postal Code"
              value={buyer.postalCode}
              onChange={e => {
                console.log("Buyer postalCode changed", e.target.value);
                setBuyer(b => ({ ...b, postalCode: e.target.value }));
              }}
              />
            </div>
            {showCheckoutIntentId && (
              <div className="bg-gray-100 rounded p-2 text-xs font-mono mt-2">
                Checkout Intent ID: {showCheckoutIntentId}
              </div>
            )}
            <button
              type="submit"
              className="bg-black text-white rounded px-4 py-2 mt-2 hover:bg-gray-800 disabled:opacity-50"
              disabled={loading || polling}
              onClick={() => console.log("Get Cost button clicked")}
            >
              {loading ? "Calculating..." : polling ? "Waiting for Rye..." : "Get Cost"}
            </button>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        )}
        {step === 2 && cost && checkoutIntentId && (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              cost={cost.total as unknown as { currencyCode: string; amountSubunits: number }}
              checkoutIntentId={checkoutIntentId}
              onBack={() => setStep(1)}
              onSuccess={checkoutIntent => {
                setResult(checkoutIntent as { id?: string, state?: string });
                setStep(3);
              }}
            />
            {showCheckoutIntentId && (
              <div className="bg-gray-100 rounded p-2 text-xs font-mono mt-2">
                Checkout Intent ID: {showCheckoutIntentId}
              </div>
            )}
          </Elements>
        )}
        {
          step === 3 && result && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-4">Final Checkout Intent Status</h2>
              <p className="text-gray-600 mb-4">Checkout Intent ID: <span className="font-mono">{result.id}</span></p>
              <p className="text-green-600">Status: {result.state}</p>
            </div>
          )
        }
        <footer className="mt-8 text-gray-400 text-xs text-center">
          Powered by <a href="https://rye.com" className="underline" target="_blank" rel="noopener noreferrer">Rye API</a> & Next.js
        </footer>
      </div>
    </div>
  );
}
