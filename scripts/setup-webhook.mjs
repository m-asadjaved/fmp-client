import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const apiKey = process.env.PADDLE_SANDBOX_API_KEY;
  if (!apiKey) {
    console.error("Please ensure PADDLE_SANDBOX_API_KEY is in your .env");
    process.exit(1);
  }

  const paddle = new Paddle(apiKey, { environment: Environment.sandbox });

  rl.question("Please enter your public tunnel URL (e.g., https://your-url.ngrok.app): ", async (url) => {
    const fullUrl = url.endsWith('/') ? `${url}api/webhooks/paddle` : `${url}/api/webhooks/paddle`;
    
    console.log(`\nCreating notification destination for: ${fullUrl}...`);
    
    try {
      const destination = await paddle.notificationSettings.create({
        description: "Local Dev Webhook",
        destination: fullUrl,
        subscribedEvents: [
          { name: "subscription.created" },
          { name: "subscription.updated" },
          { name: "subscription.canceled" },
          { name: "customer.created" },
          { name: "customer.updated" },
          { name: "transaction.completed" }
        ],
        type: "url"
      });

      console.log("\n✅ Destination created successfully!");
      console.log("-------------------------------------------------");
      console.log(`Endpoint URL: ${destination.endpointSecretKey}`);
      console.log("-------------------------------------------------");
      console.log("ADD THIS TO YOUR .env FILE:");
      console.log(`PADDLE_WEBHOOK_SECRET=${destination.endpointSecretKey}`);
      console.log("-------------------------------------------------\n");

    } catch (err) {
      console.error("Failed to create destination:", err.message || err);
    }
    
    rl.close();
  });
}

main();
