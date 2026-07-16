"use client";

import React, { createContext, useContext, useState } from "react";

const UploadContext = createContext();

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}

export function UploadProvider({ children }) {
  const [pendingFile, setPendingFile] = useState(null);

  return (
    <UploadContext.Provider value={{ pendingFile, setPendingFile }}>
      {children}
    </UploadContext.Provider>
  );
}
