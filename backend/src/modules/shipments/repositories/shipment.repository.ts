/**
 * Shipment repository: database access only.
 */

import type { Pool } from "pg";
import { getPool } from "../../../db/index.js";
import type {
  CreateShipmentDto,
  UpdateShipmentDto,
  ListShipmentsQuery,
  ShipmentRow,
} from "../dto/index.js";

export class ShipmentRepository {
  private get pool(): Pool {
    return getPool();
  }

  async getNextShipmentNo(year: number): Promise<string> {
    const prefix = `SHP-${year}-`;
    const result = await this.pool.query<{ shipment_no: string }>(
      `SELECT shipment_no FROM shipments WHERE shipment_no LIKE $1 ORDER BY shipment_no DESC LIMIT 1`,
      [prefix + "%"]
    );
    const last = result.rows[0]?.shipment_no;
    const nextNum = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  private readonly selectColumns = `id, shipment_no, vendor_code, vendor_name, forwarder_code, forwarder_name, warehouse_code, warehouse_name,
    incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country,
    destination_port_code, destination_port_name, destination_port_country, etd, eta, atd, ata, depo, depo_location, current_status,
    closed_at, close_reason, remarks, created_at, updated_at,
    pib_type, no_request_pib, nopen, nopen_date, ship_by, bl_awb, insurance_no, coo, incoterm_amount, cbm, net_weight_mt, gross_weight_mt, bm, bm_percentage, kawasan_berikat, surveyor,
    product_classification,
    unit_20ft, unit_40ft, unit_package, unit_20_iso_tank, container_count_20ft, container_count_40ft, package_count, container_count_20_iso_tank`;

  async create(dto: CreateShipmentDto, shipmentNo: string): Promise<ShipmentRow> {
    const etd = dto.etd ? new Date(dto.etd) : null;
    const eta = dto.eta ? new Date(dto.eta) : null;
    const nopenDate = dto.nopen_date ? new Date(dto.nopen_date) : null;
    const result = await this.pool.query<ShipmentRow>(
      `INSERT INTO shipments (
        shipment_no, vendor_code, vendor_name, forwarder_code, forwarder_name, warehouse_code, warehouse_name,
        incoterm, shipment_method, origin_port_code, origin_port_name, origin_port_country,
        destination_port_code, destination_port_name, destination_port_country, etd, eta, remarks,
        pib_type, no_request_pib, nopen, nopen_date, ship_by, bl_awb, insurance_no, coo, incoterm_amount, cbm, bm, bm_percentage, kawasan_berikat,
        current_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, 'INITIATE_SHIPPING_DOCUMENT', NOW(), NOW())
      RETURNING ${this.selectColumns}`,
      [
        shipmentNo,
        dto.vendor_code ?? null,
        dto.vendor_name ?? null,
        dto.forwarder_code ?? null,
        dto.forwarder_name ?? null,
        dto.warehouse_code ?? null,
        dto.warehouse_name ?? null,
        dto.incoterm ?? null,
        dto.shipment_method ?? null,
        dto.origin_port_code ?? null,
        dto.origin_port_name ?? null,
        dto.origin_port_country ?? null,
        dto.destination_port_code ?? null,
        dto.destination_port_name ?? null,
        dto.destination_port_country ?? null,
        etd,
        eta,
        dto.remarks ?? null,
        dto.pib_type ?? null,
        dto.no_request_pib ?? null,
        dto.nopen ?? null,
        nopenDate,
        dto.ship_by ?? null,
        dto.bl_awb ?? null,
        dto.insurance_no ?? null,
        dto.coo ?? null,
        dto.incoterm_amount ?? null,
        dto.cbm ?? null,
        null,
        dto.bm_percentage ?? null,
        dto.kawasan_berikat ?? null,
      ]
    );
    if (!result.rows[0]) throw new Error("ShipmentRepository.create: no row returned");
    return result.rows[0];
  }

  async findById(id: string): Promise<ShipmentRow | null> {
    const result = await this.pool.query<ShipmentRow>(
      `SELECT ${this.selectColumns} FROM shipments WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(query: ListShipmentsQuery): Promise<{ rows: ShipmentRow[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const offset = (page - 1) * limit;
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    let idx = 1;

    if (query.status) {
      conditions.push(`s.current_status = $${idx++}`);
      params.push(query.status);
    }
    if (query.supplier_name) {
      conditions.push(`s.vendor_name ILIKE $${idx++}`);
      params.push(`%${query.supplier_name}%`);
    }
    if (query.from_date) {
      conditions.push(`s.created_at >= $${idx++}`);
      params.push(query.from_date);
    }
    if (query.to_date) {
      conditions.push(`s.created_at <= $${idx++}`);
      params.push(query.to_date);
    }
    if (query.search) {
      conditions.push(
        `(s.shipment_no ILIKE $${idx} OR s.vendor_name ILIKE $${idx})`
      );
      params.push(`%${query.search}%`);
      idx++;
    }
    if (query.po_number) {
      conditions.push(`EXISTS (
        SELECT 1 FROM shipment_po_mapping m
        JOIN Import_purchase_order i ON i.id = m.intake_id AND m.decoupled_at IS NULL
        WHERE m.shipment_id = s.id AND i.po_number ILIKE $${idx}
      )`);
      params.push(`%${query.po_number}%`);
      idx++;
    }
    if (query.active_pipeline) {
      conditions.push(`s.closed_at IS NULL`);
      conditions.push(`s.current_status <> 'DELIVERED'`);
    }
    if (query.po_from_date || query.po_to_date) {
      const poDateParts = [
        `EXISTS (
          SELECT 1 FROM shipment_po_mapping m
          JOIN Import_purchase_order i ON i.id = m.intake_id AND m.decoupled_at IS NULL
          WHERE m.shipment_id = s.id`,
      ];
      if (query.po_from_date) {
        poDateParts.push(
          `AND COALESCE(i.po_date, (i.created_at AT TIME ZONE 'UTC')::date) >= $${idx}::date`
        );
        params.push(query.po_from_date);
        idx++;
      }
      if (query.po_to_date) {
        poDateParts.push(
          `AND COALESCE(i.po_date, (i.created_at AT TIME ZONE 'UTC')::date) <= $${idx}::date`
        );
        params.push(query.po_to_date);
        idx++;
      }
      poDateParts.push(`)`);
      conditions.push(poDateParts.join(" "));
    }

    const where = conditions.join(" AND ");
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM shipments s WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit, offset);
    const result = await this.pool.query<ShipmentRow>(
      `SELECT s.id, s.shipment_no, s.vendor_code, s.vendor_name, s.forwarder_code, s.forwarder_name,
        s.warehouse_code, s.warehouse_name, s.incoterm, s.shipment_method,
        s.origin_port_code, s.origin_port_name, s.origin_port_country,
        s.destination_port_code, s.destination_port_name, s.destination_port_country,
        s.etd, s.eta, s.atd, s.ata, s.depo, s.depo_location, s.current_status, s.closed_at, s.close_reason, s.remarks, s.created_at, s.updated_at,
        s.pib_type, s.no_request_pib, s.nopen, s.nopen_date, s.ship_by, s.bl_awb, s.insurance_no, s.coo,
        s.incoterm_amount, s.cbm, s.net_weight_mt, s.gross_weight_mt, s.bm, s.bm_percentage, s.kawasan_berikat, s.surveyor, s.product_classification,
        s.unit_20ft, s.unit_40ft, s.unit_package, s.unit_20_iso_tank, s.container_count_20ft, s.container_count_40ft,
        s.package_count, s.container_count_20_iso_tank
       FROM shipments s WHERE ${where} ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return { rows: result.rows, total };
  }

  async update(id: string, dto: UpdateShipmentDto): Promise<ShipmentRow | null> {
    const updates: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];
    let idx = 1;
    if (dto.etd !== undefined) {
      updates.push(`etd = $${idx++}`);
      params.push(dto.etd ? new Date(dto.etd) : null);
    }
    if (dto.eta !== undefined) {
      updates.push(`eta = $${idx++}`);
      params.push(dto.eta ? new Date(dto.eta) : null);
    }
    if (dto.atd !== undefined) {
      updates.push(`atd = $${idx++}`);
      params.push(dto.atd ? new Date(dto.atd) : null);
    }
    if (dto.ata !== undefined) {
      updates.push(`ata = $${idx++}`);
      params.push(dto.ata ? new Date(dto.ata) : null);
    }
    if (dto.depo !== undefined) {
      updates.push(`depo = $${idx++}`);
      params.push(dto.depo);
      if (dto.depo === false) {
        updates.push(`depo_location = $${idx++}`);
        params.push(null);
      }
    }
    if (dto.depo_location !== undefined && dto.depo !== false) {
      if (dto.depo === true || dto.depo === undefined) {
        updates.push(`depo_location = $${idx++}`);
        params.push(dto.depo_location);
      }
    }
    if (dto.remarks !== undefined) {
      updates.push(`remarks = $${idx++}`);
      params.push(dto.remarks);
    }
    if (dto.pib_type !== undefined) {
      updates.push(`pib_type = $${idx++}`);
      params.push(dto.pib_type);
    }
    if (dto.no_request_pib !== undefined) {
      updates.push(`no_request_pib = $${idx++}`);
      params.push(dto.no_request_pib);
    }
    if (dto.nopen !== undefined) {
      updates.push(`nopen = $${idx++}`);
      params.push(dto.nopen);
    }
    if (dto.nopen_date !== undefined) {
      updates.push(`nopen_date = $${idx++}`);
      params.push(dto.nopen_date ? new Date(dto.nopen_date) : null);
    }
    if (dto.ship_by !== undefined) {
      updates.push(`ship_by = $${idx++}`);
      params.push(dto.ship_by);
    }
    if (dto.bl_awb !== undefined) {
      updates.push(`bl_awb = $${idx++}`);
      params.push(dto.bl_awb);
    }
    if (dto.insurance_no !== undefined) {
      updates.push(`insurance_no = $${idx++}`);
      params.push(dto.insurance_no);
    }
    if (dto.coo !== undefined) {
      updates.push(`coo = $${idx++}`);
      params.push(dto.coo);
    }
    if (dto.incoterm_amount !== undefined) {
      updates.push(`incoterm_amount = $${idx++}`);
      params.push(dto.incoterm_amount);
    }
    if (dto.cbm !== undefined) {
      updates.push(`cbm = $${idx++}`);
      params.push(dto.cbm);
    }
    if (dto.net_weight_mt !== undefined) {
      updates.push(`net_weight_mt = $${idx++}`);
      params.push(dto.net_weight_mt);
    }
    if (dto.gross_weight_mt !== undefined) {
      updates.push(`gross_weight_mt = $${idx++}`);
      params.push(dto.gross_weight_mt);
    }
    if (dto.bm_percentage !== undefined) {
      updates.push(`bm_percentage = $${idx++}`);
      params.push(dto.bm_percentage);
    }
    if (dto.origin_port_name !== undefined) {
      updates.push(`origin_port_name = $${idx++}`);
      params.push(dto.origin_port_name);
    }
    if (dto.origin_port_country !== undefined) {
      updates.push(`origin_port_country = $${idx++}`);
      params.push(dto.origin_port_country);
    }
    if (dto.forwarder_name !== undefined) {
      updates.push(`forwarder_name = $${idx++}`);
      params.push(dto.forwarder_name);
    }
    if (dto.shipment_method !== undefined) {
      updates.push(`shipment_method = $${idx++}`);
      params.push(dto.shipment_method);
    }
    if (dto.destination_port_name !== undefined) {
      updates.push(`destination_port_name = $${idx++}`);
      params.push(dto.destination_port_name);
    }
    if (dto.destination_port_country !== undefined) {
      updates.push(`destination_port_country = $${idx++}`);
      params.push(dto.destination_port_country);
    }
    if (dto.vendor_name !== undefined) {
      updates.push(`vendor_name = $${idx++}`);
      params.push(dto.vendor_name);
    }
    if (dto.warehouse_name !== undefined) {
      updates.push(`warehouse_name = $${idx++}`);
      params.push(dto.warehouse_name);
    }
    if (dto.incoterm !== undefined) {
      updates.push(`incoterm = $${idx++}`);
      params.push(dto.incoterm);
    }
    if (dto.kawasan_berikat !== undefined) {
      updates.push(`kawasan_berikat = $${idx++}`);
      params.push(dto.kawasan_berikat);
    }
    if (dto.surveyor !== undefined) {
      updates.push(`surveyor = $${idx++}`);
      params.push(dto.surveyor);
    }
    if (dto.product_classification !== undefined) {
      updates.push(`product_classification = $${idx++}`);
      params.push(dto.product_classification);
    }
    if (dto.closed_at !== undefined) {
      updates.push(`closed_at = $${idx++}`);
      params.push(dto.closed_at ? new Date(dto.closed_at) : null);
    }
    if (dto.close_reason !== undefined) {
      updates.push(`close_reason = $${idx++}`);
      params.push(dto.close_reason);
    }
    if (dto.unit_20ft !== undefined) {
      updates.push(`unit_20ft = $${idx++}`);
      params.push(dto.unit_20ft);
      if (dto.unit_20ft === false) {
        updates.push(`container_count_20ft = $${idx++}`);
        params.push(null);
      }
    }
    if (dto.unit_40ft !== undefined) {
      updates.push(`unit_40ft = $${idx++}`);
      params.push(dto.unit_40ft);
      if (dto.unit_40ft === false) {
        updates.push(`container_count_40ft = $${idx++}`);
        params.push(null);
      }
    }
    if (dto.unit_package !== undefined) {
      updates.push(`unit_package = $${idx++}`);
      params.push(dto.unit_package);
      if (dto.unit_package === false) {
        updates.push(`package_count = $${idx++}`);
        params.push(null);
      }
    }
    if (dto.unit_20_iso_tank !== undefined) {
      updates.push(`unit_20_iso_tank = $${idx++}`);
      params.push(dto.unit_20_iso_tank);
      if (dto.unit_20_iso_tank === false) {
        updates.push(`container_count_20_iso_tank = $${idx++}`);
        params.push(null);
      }
    }
    if (dto.container_count_20ft !== undefined && dto.unit_20ft !== false) {
      updates.push(`container_count_20ft = $${idx++}`);
      params.push(dto.container_count_20ft);
    }
    if (dto.container_count_40ft !== undefined && dto.unit_40ft !== false) {
      updates.push(`container_count_40ft = $${idx++}`);
      params.push(dto.container_count_40ft);
    }
    if (dto.package_count !== undefined && dto.unit_package !== false) {
      updates.push(`package_count = $${idx++}`);
      params.push(dto.package_count);
    }
    if (dto.container_count_20_iso_tank !== undefined && dto.unit_20_iso_tank !== false) {
      updates.push(`container_count_20_iso_tank = $${idx++}`);
      params.push(dto.container_count_20_iso_tank);
    }
    if (params.length === 0) return this.findById(id);
    params.push(id);
    const result = await this.pool.query<ShipmentRow>(
      `UPDATE shipments SET ${updates.join(", ")} WHERE id = $${idx} RETURNING ${this.selectColumns}`,
      params
    );
    return result.rows[0] ?? null;
  }

  async close(id: string, reason: string | null): Promise<ShipmentRow | null> {
    const result = await this.pool.query<ShipmentRow>(
      `UPDATE shipments SET closed_at = NOW(), close_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING ${this.selectColumns}`,
      [reason, id]
    );
    return result.rows[0] ?? null;
  }

  async updateCurrentStatus(id: string, currentStatus: string): Promise<ShipmentRow | null> {
    const result = await this.pool.query<ShipmentRow>(
      `UPDATE shipments SET current_status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${this.selectColumns}`,
      [currentStatus, id]
    );
    return result.rows[0] ?? null;
  }

  /** Persist system-calculated BM (not exposed on public update API). */
  async updateComputedBm(id: string, bm: number): Promise<void> {
    await this.pool.query(`UPDATE shipments SET bm = $1, updated_at = NOW() WHERE id = $2`, [bm, id]);
  }
}
