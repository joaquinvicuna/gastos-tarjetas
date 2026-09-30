import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Gastos de Tarjetas</h1>
      <p className="text-sm opacity-70 text-center max-w-md">
        Sube los statements de tus tarjetas de crédito/débito y obtén un
        resumen automático de en qué gastaste, separado por categoría,
        moneda y banco.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-foreground text-background px-4 py-2 text-sm">
          Iniciar sesión
        </Link>
        <Link href="/register" className="rounded border border-black/15 dark:border-white/20 px-4 py-2 text-sm">
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
