import Link from "next/link";
import { setLang, signOut } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  const { t, lang } = await getT();
  const nav = [
    { href: "/", label: t.dashboard },
    { href: "/tasks", label: t.tasks },
    { href: "/clients", label: t.clients },
    { href: "/policies", label: t.policies },
    { href: "/insurers", label: t.insurers },
  ];
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-surface md:w-52 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/" className="text-base font-semibold text-brand">
            {t.appName}
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm hover:bg-brand-soft">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-4 pb-3 md:flex-col md:items-start md:py-6">
          <form action={setLang} className="flex gap-1">
            <button name="lang" value="de" className={`btn-ghost ${lang === "de" ? "bg-brand-soft" : ""}`}>DE</button>
            <button name="lang" value="en" className={`btn-ghost ${lang === "en" ? "bg-brand-soft" : ""}`}>EN</button>
          </form>
          <form action={signOut}>
            <button className="text-xs text-muted hover:underline">{t.signOut}</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
