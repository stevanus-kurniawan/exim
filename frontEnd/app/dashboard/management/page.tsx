import { Suspense } from "react";
import { ManagementDashboard } from "./ManagementDashboard";

export default function ManagementPage() {
  return (
    <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
      <ManagementDashboard />
    </Suspense>
  );
}
