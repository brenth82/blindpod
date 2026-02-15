"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailId = useId();
  const codeId = useId();
  const newPasswordId = useId();
  const errorId = useId();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signIn("password", { email, flow: "reset" });
      setStep("reset");
    } catch {
      setError("Could not send reset code. Check that your email is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await signIn("password", {
        email,
        code,
        newPassword,
        flow: "reset-verification",
      });
      router.push("/");
    } catch {
      setError("Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "reset") {
    return (
      <>
        <h1 className="text-3xl font-bold mb-2">Set a new password</h1>
        <p className="text-gray-600 mb-6">
          We sent an 8-digit code to <strong>{email}</strong>. Enter it along
          with your new password below.
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
          onSubmit={handleReset}
          aria-describedby={error ? errorId : undefined}
          className="space-y-5 max-w-md"
          noValidate
        >
          <div>
            <label
              htmlFor={codeId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reset code
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
              Enter the 8-digit reset code sent to your email address.
            </p>
          </div>

          <div>
            <label
              htmlFor={newPasswordId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New password
              <span className="ml-1 text-gray-500 font-normal">(min. 8 characters)</span>
            </label>
            <input
              id={newPasswordId}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-required="true"
              aria-describedby={`${newPasswordId}-hint`}
            />
            <p id={`${newPasswordId}-hint`} className="sr-only">
              New password must be at least 8 characters long.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
            aria-disabled={isLoading}
          >
            {isLoading ? "Resetting password…" : "Reset password"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setStep("request");
            setCode("");
            setNewPassword("");
            setError("");
          }}
          className="mt-4 text-sm text-blue-700 underline"
        >
          Back
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
      <p className="text-gray-600 mb-6">
        Enter your email address and we&rsquo;ll send you a reset code.
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
        onSubmit={handleRequest}
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
          aria-disabled={isLoading}
        >
          {isLoading ? "Sending code…" : "Send reset code"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Remember your password?{" "}
        <Link href="/login" className="underline text-blue-700">
          Log in here
        </Link>
        .
      </p>
    </>
  );
}
