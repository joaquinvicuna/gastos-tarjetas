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
      <h1 className="text-2xl font-semibold">Card Expenses</h1>
      <p className="text-sm opacity-70 text-center max-w-md">
        Upload your credit/debit card statements and get an automatic summary
        of what you spent, broken down by category, currency, and bank.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-foreground text-background px-4 py-2 text-sm">
          Log in
        </Link>
        <Link href="/register" className="rounded border border-black/15 dark:border-white/20 px-4 py-2 text-sm">
          Sign up
        </Link>
      </div>
    </main>
  );
}
