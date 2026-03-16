import { ImportTransactionDetail } from "./ImportTransactionDetail";

export default function ImportTransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <ImportTransactionDetail id={params.id} />;
}
