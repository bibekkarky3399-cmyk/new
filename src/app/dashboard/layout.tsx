import { redirect } from "next/navigation";
import { requireSessionWithUser } from "@/lib/session";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSessionWithUser();
  if (!ctx) {
    redirect("/login");
  }

  const { user, restaurant } = ctx;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar restaurantName={restaurant.name} userName={user.name} />
      <div className="flex-1 min-w-0">
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
