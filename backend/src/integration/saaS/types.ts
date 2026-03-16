/**
 * SaaS PO API types. Abstracted for external API or mock.
 * Rule: 1 PO = multiple items, 1 incoterm. Final PO data: Plant, PO Number, Supplier name, Items (Qty, Unit, Value), Incoterms.
 */

export interface SaasPoItem {
  item_description?: string;
  qty?: number;
  unit?: string;
  value?: number;
  kurs?: number;
}

export interface SaasPoResponse {
  external_id: string;
  po_number: string;
  plant?: string;
  supplier_name: string;
  delivery_location?: string;
  incoterm_location?: string;
  kawasan_berikat?: string;
  items?: SaasPoItem[];
}

export interface IPoApiClient {
  /** Fetch new Import POs since last sync. Implementation may use cursor/timestamp. */
  fetchNewImportPos(): Promise<SaasPoResponse[]>;
}
