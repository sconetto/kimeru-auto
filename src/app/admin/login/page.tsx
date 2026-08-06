import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/admin",
      });
    } catch (err) {
      // NextAuth throws NEXT_REDIRECT on success — rethrow it so the
      // redirect actually happens. Any other error = invalid credentials.
      if (isRedirectError(err)) throw err;
      return redirect("/admin/login?error=1");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Kimeru Auto</h1>
          <p className="mt-2 text-sm text-slate-400">Painel administrativo</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Email ou senha inválidos.
          </div>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <LoginForm action={authenticate} />
        </div>
      </div>
    </main>
  );
}
