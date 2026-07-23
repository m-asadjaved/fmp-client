"use client";

import { useState, useEffect } from "react";
import { createPortalSession } from "../../actions/portal";
import { getBillingHistory } from "../../actions/billing-history";
import { useUser } from "@clerk/nextjs";
import { Zap, ArrowUpRight, ArrowDownRight, Loader2, CreditCard, ChevronRight } from "lucide-react";

export default function CreditsHistoryPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);
  
  const [metrics, setMetrics] = useState({ balance: 0, plan: "Loading..." });
  const [transactions, setTransactions] = useState([]);
  const [billingTransactions, setBillingTransactions] = useState([]);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      // Fetch current balance
      fetch('/api/credits')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            let planName = data.currentPlan || "Free";
            if (planName.startsWith("pri_")) {
              planName = "Premium";
            } else {
              planName = planName.charAt(0).toUpperCase() + planName.slice(1);
            }
            
            setMetrics({
              balance: data.balance,
              plan: planName
            });
          }
        })
        .catch(console.error);

      // Fetch history
      fetch('/api/credits/history')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTransactions(data.transactions || []);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));

      // Fetch Billing History
      getBillingHistory()
        .then(result => {
          if (!result.error) {
            setBillingTransactions(result.items || []);
          }
        })
        .catch(console.error)
        .finally(() => setBillingLoading(false));
    }
  }, [isSignedIn]);

  const { useRouter } = require('next/navigation');
  const router = useRouter();
  
  const handleManageBilling = () => {
    router.push("/#pay-as-you-go");
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"></div>
          <p className="text-[var(--on-surface-variant)] font-medium tracking-wider text-sm uppercase">Loading Credits</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dot-pattern py-10 px-4 sm:px-6 lg:px-8 w-full min-h-[100vh]">
      <div className="max-w-[85rem] mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[var(--on-surface)] tracking-tight">Credits & Billing</h1>
            <p className="text-base text-[var(--on-surface-variant)] font-medium">View your credit usage and manage your subscription.</p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-gradient-to-r from-[#A855F7] to-[#ff6118] hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300"
          >
            {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            <span>Buy More Credits</span>
            {!portalLoading && <ChevronRight size={16} className="opacity-70" />}
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-1">
          <div className="bg-[var(--surface)] rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center gap-5">
             <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
               <Zap className="text-purple-500 fill-purple-500" size={28} />
             </div>
             <div>
               <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1">Current Balance</p>
               <h2 className="text-3xl font-extrabold text-[var(--on-surface)]">{metrics.balance.toFixed(1)} <span className="text-lg text-[var(--on-surface-variant)] font-semibold">Credits</span></h2>
             </div>
          </div>
          <div className="bg-[var(--surface)] rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center gap-5">
             <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
               <CreditCard className="text-orange-500" size={28} />
             </div>
             <div>
               <p className="text-sm font-medium text-[var(--on-surface-variant)] mb-1">Active Plan</p>
               <h2 className="text-2xl font-extrabold bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-transparent bg-clip-text uppercase tracking-wide">{metrics.plan}</h2>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transactions Table */}
          <div className="stagger-2 bg-[var(--surface)] rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-gray-200 bg-[var(--surface-bg)]/50">
              <h3 className="text-lg font-bold text-[var(--on-surface)]">Credit Usage History</h3>
            </div>
            
            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-1">No transactions yet</h3>
                  <p className="text-[var(--on-surface-variant)]">When you use or purchase credits, they will appear here.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-bg)]/20 border-b border-gray-200">
                      <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => {
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-[var(--surface-bg)]/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--on-surface-variant)] font-medium">
                          {new Date(tx.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--on-surface)] font-medium">
                          {tx.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isPositive 
                              ? "bg-green-50 text-green-700 border border-green-200" 
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {isPositive ? '+' : ''}{tx.amount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Billing & Payments Table */}
        <div className="stagger-3 bg-[var(--surface)] rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-gray-200 bg-[var(--surface-bg)]/50">
            <h3 className="text-lg font-bold text-[var(--on-surface)]">Billing & Payments</h3>
          </div>
          
          <div className="overflow-x-auto flex-1">
            {billingLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
              </div>
            ) : billingTransactions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="text-gray-400" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--on-surface)] mb-1">No billing history yet</h3>
                <p className="text-[var(--on-surface-variant)]">When you make a payment, it will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-bg)]/20 border-b border-gray-200">
                    <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-right">Amount Paid</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-right">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billingTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--surface-bg)]/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--on-surface-variant)] font-medium">
                        {tx.billedAt ? new Date(tx.billedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--on-surface)] font-medium capitalize">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'completed' || tx.status === 'paid' ? 'bg-green-100 text-green-800' : 
                          tx.status === 'past_due' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tx.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-[var(--on-surface)]">
                        {tx.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-[var(--on-surface-variant)]">
                        {tx.cardLast4 ? `${tx.cardBrand} •••• ${tx.cardLast4}` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </div>

      </div>
    </div>
  );
}
