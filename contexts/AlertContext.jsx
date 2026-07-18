"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

const AlertContext = createContext();

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}

export function AlertProvider({ children }) {
  const [alert, setAlertState] = useState(null);

  const showAlert = useCallback((title, message, type = "info", options = {}) => {
    setAlertState({ title, message, type, ...options });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AnimatePresence>
        {alert && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeAlert}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100"
            >
              <div className="flex items-start p-6 gap-4">
                <div className="flex-shrink-0 mt-1">
                  {alert.type === "success" && <CheckCircle2 className="h-6 w-6 text-green-500" />}
                  {alert.type === "error" && <AlertCircle className="h-6 w-6 text-red-500" />}
                  {alert.type === "warning" && <AlertTriangle className="h-6 w-6 text-amber-500" />}
                  {alert.type === "info" && <Info className="h-6 w-6 text-blue-500" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    {alert.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                <button
                  onClick={closeAlert}
                  className="flex-shrink-0 ml-4 -mt-2 -mr-2 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                {alert.onConfirm ? (
                  <>
                    <button
                      onClick={closeAlert}
                      className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors border-none cursor-pointer mr-3"
                    >
                      {alert.cancelText || "Cancel"}
                    </button>
                    <button
                      onClick={() => {
                        alert.onConfirm();
                        closeAlert();
                      }}
                      className={`
                        px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm cursor-pointer border-none
                        ${alert.type === "success" ? "bg-green-600 hover:bg-green-700" : ""}
                        ${alert.type === "error" ? "bg-red-600 hover:bg-red-700" : ""}
                        ${alert.type === "warning" ? "bg-amber-600 hover:bg-amber-700" : ""}
                        ${alert.type === "info" ? "bg-blue-600 hover:bg-blue-700" : ""}
                        ${!["success", "error", "warning", "info"].includes(alert.type) ? "bg-[#0F2347] hover:bg-[#1a3668]" : ""}
                      `}
                    >
                      {alert.confirmText || "Confirm"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeAlert}
                    className={`
                      px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm cursor-pointer border-none
                      ${alert.type === "success" ? "bg-green-600 hover:bg-green-700" : ""}
                      ${alert.type === "error" ? "bg-red-600 hover:bg-red-700" : ""}
                      ${alert.type === "warning" ? "bg-amber-600 hover:bg-amber-700" : ""}
                      ${alert.type === "info" ? "bg-blue-600 hover:bg-blue-700" : ""}
                      ${!["success", "error", "warning", "info"].includes(alert.type) ? "bg-[#0F2347] hover:bg-[#1a3668]" : ""}
                    `}
                  >
                    Got it
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
}
