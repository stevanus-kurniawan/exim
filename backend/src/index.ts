/**
 * Backend entry: load config, connect DB, create app, start server, start PO polling if enabled.
 */

import { config } from "./config/index.js";
import { connectDb, closeDb } from "./db/index.js";
import { createApp } from "./app/index.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";
import { PoIntakeRepository } from "./modules/po-intake/repositories/po-intake.repository.js";
import { createPoApiClient, startPoPolling } from "./integration/saaS/index.js";

async function main(): Promise<void> {
  try {
    await connectDb();
  } catch (err) {
    logger.error("Database connection failed", { error: String(err) });
    process.exit(1);
  }

  const app = createApp();
  await createServer(app);

  if (config.poPolling.enabled) {
    const repo = new PoIntakeRepository();
    const client = createPoApiClient(config.poPolling.saasApiBaseUrl);
    startPoPolling(repo, client, config.poPolling.intervalMs);
  }
}

main().catch((err) => {
  logger.error("Bootstrap failed", { error: String(err) });
  process.exit(1);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, stopping polling and closing DB");
  const { stopPoPolling } = await import("./integration/saaS/index.js");
  stopPoPolling();
  await closeDb();
  process.exit(0);
});
