/**
 * PO API client: abstracted. Mock implementation for development; replace with real SaaS client.
 * Set MOCK_PO_SAMPLES=true to return sample POs (final structure: Plant, PO Number, Supplier, Items with Qty/Unit/Value, Incoterms).
 */

import type { IPoApiClient, SaasPoResponse } from "./types.js";
import { mockPoSamples } from "./mock-po-samples.js";

export class MockPoApiClient implements IPoApiClient {
  async fetchNewImportPos(): Promise<SaasPoResponse[]> {
    if (process.env.MOCK_PO_SAMPLES === "true" || process.env.MOCK_PO_SAMPLES === "1") {
      return mockPoSamples;
    }
    return [];
  }
}

/**
 * Factory: returns mock by default. Replace with real client when SaaS API is available.
 */
export function createPoApiClient(_baseUrl?: string): IPoApiClient {
  return new MockPoApiClient();
}
