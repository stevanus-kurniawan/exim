import { Suspense } from "react";
import { ShipmentList } from "./ShipmentList";

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ShipmentList />
    </Suspense>
  );
}
