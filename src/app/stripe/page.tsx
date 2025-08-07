"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_API_KEY || "");

const CARD_ELEMENT_OPTIONS = {
  disableLink: true,
  style: {
    base: {
      fontSize: '16px',
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      '::placeholder': {
        color: '#a0aec0',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

function StripeJSTokenizer() {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) throw new Error("Card element not found");
    const { token, error } = await stripe.createToken(card);

    if (error) {
      setStatus(`❌ ${error.message}`);
    } else {
      setStatus(`✅ Token: ${token.id}`);
      // Optionally send token to your backend
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='w-full max-w-md mx-auto mt-8 p-6 border border-gray-300 rounded-xl shadow-sm bg-white'
    >
      <h2 className='text-lg font-semibold mb-4 text-gray-800'>
        Enter Card Details
      </h2>
      <div className='mb-4 p-2 border border-gray-300 rounded'>
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      <button
        type='submit'
        disabled={!stripe}
        className='w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded hover:bg-indigo-700 transition'
      >
        Tokenize Card
      </button>
      {status && (
        <p className='mt-4 text-sm text-gray-700 bg-gray-100 p-2 rounded'>
          {status}
        </p>
      )}
    </form>
  );
}

export default function StripeJSDemo() {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <Elements stripe={stripePromise}>
        <StripeJSTokenizer />
      </Elements>
    </div>
  );
}
