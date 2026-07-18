import { Environment, Paddle } from "@paddle/paddle-node-sdk";
const apiKey = process.env.PADDLE_SANDBOX_API_KEY;
const paddle = new Paddle(apiKey, { environment: Environment.sandbox });

function toSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

async function test() {
  const events = paddle.events.list();
  for await (const event of events) {
    const plainObj = JSON.parse(JSON.stringify(event));
    console.log(Object.keys(plainObj));
    const snakeObj = toSnakeCase(plainObj);
    console.log("event_type:", snakeObj.event_type);
    console.log("event_id:", snakeObj.event_id);
    break;
  }
}
test();
