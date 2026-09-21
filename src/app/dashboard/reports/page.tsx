import { requireSessionWithUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/reports/ReportsView";

export default async function ReportsPage() {
  const ctx = await requireSessionWithUser();
  if (!ctx) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sales summary for a date range. Export the underlying orders as CSV.
      </p>
      <div className="mt-6">
        <ReportsView currency={ctx.restaurant.currency} />
      </div>
    </div>
  );
}
