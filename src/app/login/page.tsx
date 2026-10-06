import { signIn, signUp } from "@/app/actions";
import { getT } from "@/lib/i18n";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { t } = await getT();
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-brand">{t.appName}</h1>
          <p className="text-sm text-muted">{t.loginIntro}</p>
        </div>
        {sp.error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">Sign-in failed / Anmeldung fehlgeschlagen.</p>}
        {sp.check && <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand">{t.checkEmail}</p>}
        <label className="block">
          <span className="label">{t.email}</span>
          <input className="field" type="email" name="email" autoComplete="email" required />
        </label>
        <label className="block">
          <span className="label">{t.password}</span>
          <input className="field" type="password" name="password" autoComplete="current-password" minLength={10} required />
        </label>
        <div className="flex items-center gap-3">
          <button className="btn" formAction={signIn}>{t.signIn}</button>
          <button className="btn-ghost" formAction={signUp}>{t.createAccount}</button>
        </div>
      </form>
    </main>
  );
}
