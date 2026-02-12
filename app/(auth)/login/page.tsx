"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<"login" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const codeId = useId();
  const errorId = useId();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("password", { email, password, flow: "signIn" });
      if (!result) {
        // Email not yet verified — show OTP step
        setStep("verify");
      } else {
        router.push("/");
      }
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signIn("password", { email, code, flow: "email-verification" });
      router.push("/");
    } catch {
      setError("Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <>
        <h1 className="text-3xl font-bold mb-2">Verify your email</h1>
        <p className="text-gray-600 mb-6">
          We sent an 8-digit code to <strong>{email}</strong>. Enter it below to
          complete sign-in.
        </p>

        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleVerify}
          aria-describedby={error ? errorId : undefined}
          className="space-y-5 max-w-md"
          noValidate
        >
          <div>
            <label
              htmlFor={codeId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Verification code
            </label>
            <input
              id={codeId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg tracking-widest"
              aria-required="true"
              aria-describedby={`${codeId}-hint`}
            />
            <p id={`${codeId}-hint`} className="sr-only">
              Enter the 8-digit code sent to your email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
            aria-disabled={isLoading}
          >
            {isLoading ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setStep("login");
            setCode("");
            setError("");
          }}
          className="mt-4 text-sm text-blue-700 underline"
        >
          Back to login
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Log in to Blindpod</h1>

      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleLogin}
        aria-describedby={error ? errorId : undefined}
        className="space-y-5 max-w-md"
        noValidate
      >
        <div>
          <label
            htmlFor={emailId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email address
          </label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

        <div>
          <label
            htmlFor={passwordId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
          aria-disabled={isLoading}
        >
          {isLoading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Don&rsquo;t have an account?{" "}
        <Link href="/register" className="underline text-blue-700">
          Register here
        </Link>
        .
      </p>
    </>
  );
}
