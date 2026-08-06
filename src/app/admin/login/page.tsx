import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Kimeru Auto</h1>
          <p className="mt-2 text-sm text-slate-400">Painel administrativo</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
