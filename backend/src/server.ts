import "dotenv/config";
import cors from "cors";
import express from "express";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { z } from "zod";
import { poolAbi } from "./poolAbi.js";

const app = express();
app.use(cors());
app.use(express.json());

const rpcUrl = process.env.RPC_URL;
const relayerPk = process.env.RELAYER_PRIVATE_KEY;
const poolAddress = process.env.POOL_ADDRESS;

const relayerReady = Boolean(rpcUrl && relayerPk && poolAddress);

let pool: Contract | null = null;
if (relayerReady) {
  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(relayerPk!, provider);
  pool = new Contract(poolAddress!, poolAbi, wallet);
}

const health = {
  service: "private-defi-backend",
  status: "ok"
};

app.get("/health", (_req, res) => {
  res.json({ ...health, relayerReady });
});

app.get("/root", async (_req, res) => {
  if (!pool) {
    return res.status(503).json({
      error: "Relayer not configured",
      message: "Set RPC_URL, RELAYER_PRIVATE_KEY and POOL_ADDRESS in backend env."
    });
  }

  try {
    const latestRoot = await pool.latestRoot();
    return res.json({ latestRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch root";
    return res.status(500).json({ error: "Root fetch failed", message });
  }
});

const withdrawSchema = z.object({
  proof: z.string().min(10),
  root: z.string().length(66),
  nullifierHash: z.string().length(66),
  recipient: z.string().length(42),
  token: z.string().length(42),
  amount: z.string()
});

app.post("/withdraw", async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid withdraw payload", details: parsed.error.flatten() });
  }

  if (!pool) {
    return res.status(503).json({
      error: "Relayer not configured",
      message: "Set RPC_URL, RELAYER_PRIVATE_KEY and POOL_ADDRESS in backend env."
    });
  }

  try {
    const tx = await pool.withdraw(
      parsed.data.proof,
      parsed.data.root,
      parsed.data.nullifierHash,
      parsed.data.recipient,
      parsed.data.token,
      BigInt(parsed.data.amount)
    );
    const receipt = await tx.wait();
    return res.json({
      accepted: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown withdraw error";
    return res.status(500).json({ error: "Withdraw failed", message });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`Private DeFi backend running on :${port}`);
});
