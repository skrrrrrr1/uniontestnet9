import { unionClient } from "./client";
import type { TransferAssetsParameters } from "@unionlabs/client";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("❌ Missing PRIVATE_KEY in .env file");
  process.exit(1);
}

// Bridge destinations
const destinations = [
  { id: "stride-internal-1", receiver: "stride17ttpfu2xsmfxu6shl756mmxyqu33l5ljegnwps" },
  { id: "babylon-testnet-1", receiver: "babylon1xyzxyzxyzxyzxyzxyzxyzxyzxyzxyz" },
  { id: "holesky-testnet-1", receiver: "holesky1xyzxyzxyzxyzxyzxyzxyzxyzxyzxyz" }
];

// Token contract address (example: HONEY token)
const DENOM_ADDRESS = "0x0E4aaF1351de4c0264C5c7056Ef3777b41BD8e03";

async function bridgeAssets(destination: { id: string; receiver: string }) {
  console.log(`🚀 Starting transfer to ${destination.id}`);

  const transferPayload: TransferAssetsParameters<"80084"> = {
    amount: 1n, // Adjust the amount as needed
    autoApprove: false, // We'll manually approve transactions
    destinationChainId: destination.id,
    receiver: destination.receiver,
    denomAddress: DENOM_ADDRESS
  };

  try {
    // Approve the transaction
    const approval = await unionClient.approveTransaction(transferPayload);
    if (approval.isErr()) {
      throw new Error(`Approval failed: ${approval.error}`);
    }
    console.info(`✅ Approval hash: ${approval.value}`);

    // Transfer assets
    const transfer = await unionClient.transferAsset(transferPayload);
    if (transfer.isErr()) {
      throw new Error(`Transfer failed: ${transfer.error}`);
    }
    console.info(`✅ Transfer hash: ${transfer.value}`);

  } catch (error) {
    console.error(`❌ Error bridging to ${destination.id}: ${error.message}`);
    setTimeout(() => bridgeAssets(destination), 5000); // Retry after 5 seconds
  }
}

// Run bot every 30 seconds
async function startBot() {
  while (true) {
    for (const destination of destinations) {
      await bridgeAssets(destination);
    }
    console.log("⏳ Waiting 30 seconds before next batch...");
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

startBot();
