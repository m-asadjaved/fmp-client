"use client";

import { useState } from "react";
import { createPortalSession } from "../../actions/portal";
import { useUser, UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleManageSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createPortalSession();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8 flex flex-col items-center">
      
      {/* Clerk User Profile Management */}
      <div className="w-full max-w-[55rem] flex justify-center">
        <UserProfile 
          routing="hash" 
          appearance={{
            elements: {
              rootBox: "w-full shadow sm:rounded-lg",
              card: "w-full shadow-none"
            }
          }}
        />
      </div>

      {/* Subscription Management */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full max-w-[55rem]">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Billing & Subscription</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Update your payment method, view invoices, or manage your subscription plan securely through Paddle.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0058bc] hover:bg-[#004a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0058bc] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Open Billing Portal"}
          </button>
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
