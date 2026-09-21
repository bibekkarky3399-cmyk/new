import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">QR Menu</span>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            QR menus and ordering for small restaurants and cafés
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Print a QR code for every table. Guests scan, browse your live
            menu, and order — no app to install. You manage everything from
            one dashboard: menu, orders, and sales reports.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/register"
              className="rounded-md bg-slate-900 px-6 py-3 text-white font-semibold hover:bg-slate-800"
            >
              Create your restaurant
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Log in
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ul className="space-y-4 text-slate-700">
            {[
              "Live menu with categories, photos, and instant availability toggles",
              "Unique QR code per table with printable posters",
              "Guests order from their phone — no login required",
              "Live order dashboard with status tracking",
              "Sales reports with CSV export",
              "Branding, currency, and tax settings per restaurant",
            ].map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
