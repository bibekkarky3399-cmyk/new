"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/qr", label: "QR Codes" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function Sidebar({
  restaurantName,
  userName,
}: {
  restaurantName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200">
        <p className="text-sm text-slate-500">Restaurant</p>
        <p className="font-semibold text-slate-900 truncate">
          {restaurantName}
        </p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-slate-200">
        <p className="px-2 text-sm text-slate-500 truncate">{userName}</p>
        <button
          onClick={logout}
          className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
