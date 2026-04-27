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
import {
  CoupaPoApiClient,
  PurchaseOrderStagingRepository,
  startCoupaStagingIntegration,
  stopCoupaStagingIntegration,
} from "./integration/coupa/index.js";

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

  if (config.coupa.enabled) {
    const coupa = CoupaPoApiClient.fromConfig({
      baseUrl: config.coupa.baseUrl,
      issuedListPathOrUrl: config.coupa.issuedListPathOrUrl,
      accessToken: config.coupa.accessToken,
      clientId: config.coupa.clientId,
      clientSecret: config.coupa.clientSecret,
      oauthTokenUrl: config.coupa.oauthTokenUrl,
      oauthScope: config.coupa.oauthScope,
      requestTimeoutMs: config.coupa.requestTimeoutMs,
    });
    startCoupaStagingIntegration(
      {
        stagingRepo: new PurchaseOrderStagingRepository(),
        poRepo: new PoIntakeRepository(),
        coupa,
      },
      { ingestMs: config.coupa.ingestIntervalMs, processorMs: config.coupa.processorIntervalMs }
    );
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
  stopCoupaStagingIntegration();
  await closeDb();
  process.exit(0);
});
