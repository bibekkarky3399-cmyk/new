import { requireSessionWithUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const ctx = await requireSessionWithUser();
  if (!ctx) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Branding, currency, tax, and business details for your public menu.
      </p>
      <div className="mt-6 max-w-xl">
        <SettingsForm
          restaurant={{
            name: ctx.restaurant.name,
            currency: ctx.restaurant.currency,
            taxRateBps: ctx.restaurant.taxRateBps,
            logoUrl: ctx.restaurant.logoUrl ?? "",
            primaryColor: ctx.restaurant.primaryColor,
            address: ctx.restaurant.address ?? "",
            phone: ctx.restaurant.phone ?? "",
          }}
          canEdit={ctx.session.role === "OWNER"}
        />
      </div>
    </div>
  );
}
