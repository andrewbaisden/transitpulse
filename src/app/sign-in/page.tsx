import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
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
