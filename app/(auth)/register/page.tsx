"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<"register" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const codeId = useId();
  const errorId = useId();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("password", {
        name,
        email,
        password,
        flow: "signUp",
      });
      if (!result) {
        // Email verification required — show OTP step
        setStep("verify");
      } else {
        router.push("/");
      }
    } catch {
      setError("Registration failed. That email may already be in use.");
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
        <h1 className="text-3xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-600 mb-6">
          We sent an 8-digit code to <strong>{email}</strong>. Enter it below to
          verify your account.
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
            setStep("register");
            setCode("");
            setError("");
          }}
          className="mt-4 text-sm text-blue-700 underline"
        >
          Back to registration
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Create your Blindpod account</h1>

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
        onSubmit={handleRegister}
        aria-describedby={error ? errorId : undefined}
        className="space-y-5 max-w-md"
        noValidate
      >
        <div>
          <label
            htmlFor={nameId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full name
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

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
            <span className="ml-1 text-gray-500 font-normal">(min. 8 characters)</span>
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
            aria-describedby={`${passwordId}-hint`}
          />
          <p id={`${passwordId}-hint`} className="sr-only">
            Password must be at least 8 characters long.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
          aria-disabled={isLoading}
        >
          {isLoading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="underline text-blue-700">
          Log in here
        </Link>
        .
      </p>
    </>
  );
}
