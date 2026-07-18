import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

export function getPaddleInstance() {
  const options = {
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENV === 'production' 
        ? Environment.production 
        : Environment.sandbox,
    logLevel: LogLevel.error,
  };
  const apiKey = process.env.PADDLE_API_KEY || process.env.PADDLE_SANDBOX_API_KEY;
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not set");
  }
  return new Paddle(apiKey, options);
}
