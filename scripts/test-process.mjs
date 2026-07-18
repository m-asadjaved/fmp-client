import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import crypto from "crypto";
import { processEvent } from "../app/utils/paddle/process-webhook.js";

// Load .env variables
import fs from "fs";
const envConfig = fs.readFileSync(".env", "utf8").split("\n");
for (const line of envConfig) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

function toSnakeCase(obj) {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

async function testEventProcessing() {
  const apiKey = process.env.PADDLE_SANDBOX_API_KEY;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  const paddle = new Paddle(apiKey, { environment: Environment.sandbox });
  
  const events = paddle.events.list();
  for await (const event of events) {
    if (event.eventType === "subscription.created" || event.type === "subscription.created") {
      console.log("Found subscription.created...");
      const rawEvent = toSnakeCase(JSON.parse(JSON.stringify(event)));
      if (rawEvent.event_type && rawEvent.event_type.value) {
        rawEvent.event_type = rawEvent.event_type.value;
      } else if (event.type) {
         rawEvent.event_type = event.type;
      } else if (event.eventType) {
         rawEvent.event_type = event.eventType;
      }

      const rawBody = JSON.stringify(rawEvent);
      const ts = Math.floor(Date.now() / 1000).toString();
      const payload = `${ts}:${rawBody}`;
      const h1 = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
      const signature = `ts=${ts};h1=${h1}`;

      try {
        const eventData = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
        await processEvent(eventData);
        console.log("Successfully processed!");
      } catch (err) {
        console.error("Error processing event:", err);
      }
      break;
    }
  }
}
testEventProcessing();
