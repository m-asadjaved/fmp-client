/**
 * deploy-remotion.mjs
 * Deploys the Remotion site bundle to S3 and prints the serve URL.
 * Run with:  node deploy-remotion.mjs
 */

import { deploySite, getOrCreateBucket } from "@remotion/lambda";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ── Load .env.local manually (no dotenv dependency) ───────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
  console.log("✓ Loaded .env.local");
} else {
  console.warn("⚠  .env.local not found, using existing environment variables");
}

const REGION = process.env.AWS_REGION || "us-east-1";
const SITE_NAME = "fmp-captions";
const ENTRY_POINT = path.join(__dirname, "remotion", "index.js");

console.log(`\n🚀 Deploying Remotion site to S3...`);
console.log(`   Region   : ${REGION}`);
console.log(`   Site name: ${SITE_NAME}`);
console.log(`   Entry    : ${ENTRY_POINT}\n`);

try {
  // 1. Ensure the Remotion S3 bucket exists (creates it if not)
  const { bucketName } = await getOrCreateBucket({ region: REGION });
  console.log(`✓ S3 bucket: ${bucketName}`);

  // 2. Deploy the site bundle
  const { serveUrl, siteName } = await deploySite({
    entryPoint: ENTRY_POINT,
    siteName: SITE_NAME,
    region: REGION,
    bucketName,
    options: {
      onBundleProgress: (progress) => {
        process.stdout.write(`\r  Bundling... ${Math.round(progress * 100)}%`);
      },
      onUploadProgress: ({ totalFiles, filesUploaded }) => {
        process.stdout.write(`\r  Uploading... ${filesUploaded}/${totalFiles} files`);
      },
    },
  });

  console.log(`\n\n✅ Remotion site deployed successfully!\n`);
  console.log(`   Serve URL : ${serveUrl}`);
  console.log(`   Site name : ${siteName}\n`);

  console.log("─".repeat(60));
  console.log("Add these to your .env.local:\n");
  console.log(`REMOTION_SERVE_URL=${serveUrl}`);
  console.log(`REMOTION_AWS_REGION=${REGION}`);
  console.log(`REMOTION_FUNCTION_NAME=remotion-render-4-0-484-mem2048mb-disk2048mb-900sec`);
  console.log("─".repeat(60) + "\n");

} catch (err) {
  console.error("\n❌ Deployment failed:", err.message);
  if (err.message?.includes("credentials")) {
    console.error("\nHint: Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set correctly in .env.local");
  }
  process.exit(1);
}
