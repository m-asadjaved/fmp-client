"use client";

import { useState } from "react";
import { createPortalSession } from "../../actions/portal";
import { useUser } from "@clerk/nextjs";

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
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Account Settings</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage your email, preferences, and billing.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.primaryEmailAddress?.emailAddress}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 mb-2">Subscription Management</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#0058bc] hover:bg-[#004a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0058bc] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Manage Subscription"}
                </button>
                {error && (
                  <p className="mt-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Update your payment method, view invoices, or cancel your subscription via the Paddle Customer Portal.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
