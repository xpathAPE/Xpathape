export default function OrderBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    REFUNDED: "bg-slate-100 text-slate-600",
    FAILED: "bg-red-100 text-red-700",
    CANCELED: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`badge ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>
  );
}
