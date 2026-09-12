import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-white bg-white/85 p-7 shadow-soft sm:p-9">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0a2540]">Sign in</h1>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/sign-up" className="underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
