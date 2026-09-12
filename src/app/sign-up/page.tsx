import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-white bg-white/85 p-7 shadow-soft sm:p-9">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">Personalise</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0a2540]">
          Create an account
        </h1>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
