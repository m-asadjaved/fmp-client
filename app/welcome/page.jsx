import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-20 w-20 text-[#14B8A6]" />
        </div>
        
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome aboard!
        </h2>
        
        <p className="mt-2 text-sm text-slate-600">
          Your payment was successful and your subscription is now active. We're thrilled to have you!
        </p>
        
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#0058bc] hover:bg-[#004a9e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0058bc] transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
