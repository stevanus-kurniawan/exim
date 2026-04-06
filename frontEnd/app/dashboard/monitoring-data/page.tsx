import { Suspense } from "react";
import { MonitoringDataPage } from "./MonitoringDataPage";

export default function MonitoringDataRoute() {
  return (
    <Suspense fallback={<p className="utilLoadingFallback">Loading…</p>}>
      <MonitoringDataPage />
    </Suspense>
  );
}
