import { Suspense } from "react";
import { ImportTransactionList } from "./ImportTransactionList";

export default function ImportTransactionsPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ImportTransactionList />
    </Suspense>
  );
}
