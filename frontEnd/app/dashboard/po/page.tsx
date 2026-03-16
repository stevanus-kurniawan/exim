import { Suspense } from "react";
import { PoList } from "./PoList";

export default function PoPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PoList />
    </Suspense>
  );
}
