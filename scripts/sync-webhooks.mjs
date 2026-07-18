import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import crypto from "crypto";

// Helper to convert camelCase to snake_case deeply
function toSnakeCase(obj, isCustomData = false) {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item, isCustomData));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (isCustomData) {
        // Do not convert keys inside customData
        acc[key] = obj[key];
      } else {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = toSnakeCase(obj[key], key === 'customData' || key === 'custom_data');
      }
      return acc;
    }, {});
  }
  return obj;
}

async function syncPendingWebhooks() {
  const apiKey = process.env.PADDLE_SANDBOX_API_KEY;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  const paddle = new Paddle(apiKey, { environment: Environment.sandbox });
  const events = paddle.events.list();
  
  const recentEvents = [];
  let count = 0;
  for await (const event of events) {
    recentEvents.push(event);
    count++;
    if (count >= 10) break;
  }

  recentEvents.reverse();

  for (const event of recentEvents) {
    // 1. Serialize to plain JS object first so getters are resolved
    const plainObj = JSON.parse(JSON.stringify(event));
    
    // 2. Convert to snake_case to mock Paddle's actual webhook payload
    const rawEvent = toSnakeCase(plainObj);

    const rawBody = JSON.stringify(rawEvent);
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = `${ts}:${rawBody}`;
    const h1 = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    const signature = `ts=${ts};h1=${h1}`;

    console.log(`\n-> Sending ${rawEvent.event_type} (${rawEvent.event_id})`);

    try {
      const response = await fetch("http://localhost:3000/api/webhooks/paddle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "paddle-signature": signature
        },
        body: rawBody
      });
      const responseText = await response.text();
      console.log(`<- Response: ${response.status} ${responseText}`);
    } catch (err) {
      console.error(`<- Failed to send: ${err.message}`);
    }
  }
}

syncPendingWebhooks().catch(console.error);
