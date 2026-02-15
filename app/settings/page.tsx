"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn } = useAuthActions();

  const currentUser = useQuery(api.users.currentUser);
  const profile = useQuery(api.users.getUserProfile);
  const updateNotifications = useMutation(api.users.updateNotificationPreference);
  const deleteAccount = useMutation(api.users.deleteCurrentUser);
  const requestEmailChange = useAction(api.users.requestEmailChange);
  const confirmEmailChange = useMutation(api.users.confirmEmailChange);

  // Notification preference
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState("");

  // Change password (current password + new password — no email OTP needed when logged in)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwStatus, setPwStatus] = useState("");

  // Change email
  const [emailStep, setEmailStep] = useState<"idle" | "code-sent" | "submitting">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  // Delete account
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleteError, setDeleteError] = useState("");

  // IDs for aria associations
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const pwErrorId = useId();
  const newEmailId = useId();
  const emailCodeId = useId();
  const emailErrorId = useId();
  const deleteErrorId = useId();
  const notifStatusId = useId();

  if (!authLoading && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  if (authLoading || !currentUser || !profile) {
    return <p aria-live="polite">Loading settings…</p>;
  }

  const handleNotifToggle = async () => {
    setNotifSaving(true);
    setNotifStatus("");
    try {
      await updateNotifications({
        notifyOnNewEpisodes: !profile.notifyOnNewEpisodes,
      });
      setNotifStatus(
        !profile.notifyOnNewEpisodes
          ? "Email notifications enabled."
          : "Email notifications disabled."
      );
    } finally {
      setNotifSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwStatus("");

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    setPwSubmitting(true);
    try {
      await signIn("password", {
        email: currentUser.email as string,
        password: currentPassword,
        newPassword,
        flow: "signIn",
      });
      setCurrentPassword("");
      setNewPassword("");
      setPwStatus("Password changed successfully.");
    } catch {
      setPwError("Current password is incorrect. Please try again.");
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailStatus("");
    setEmailStep("submitting");
    try {
      await requestEmailChange({ newEmail });
      setEmailStep("code-sent");
      setEmailStatus(`Verification code sent to ${newEmail}.`);
    } catch (err: unknown) {
      setEmailError(
        err instanceof Error ? err.message : "Failed to send verification code."
      );
      setEmailStep("idle");
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailStep("submitting");
    try {
      await confirmEmailChange({ code: emailCode });
      setEmailStep("idle");
      setNewEmail("");
      setEmailCode("");
      setEmailStatus("Email address updated successfully.");
    } catch (err: unknown) {
      setEmailError(
        err instanceof Error ? err.message : "Invalid or expired code. Please try again."
      );
      setEmailStep("code-sent");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    try {
      await deleteAccount();
      router.replace("/login");
    } catch {
      setDeleteError("Failed to delete account. Please try again.");
      setDeleteStep("idle");
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Notifications */}
      <section aria-labelledby="notif-heading" className="mb-10">
        <h2 id="notif-heading" className="text-xl font-semibold mb-4">
          Notifications
        </h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={profile.notifyOnNewEpisodes}
            onClick={handleNotifToggle}
            disabled={notifSaving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 ${
              profile.notifyOnNewEpisodes ? "bg-blue-700" : "bg-gray-300"
            }`}
            aria-describedby={notifStatus ? notifStatusId : undefined}
          >
            <span className="sr-only">
              {profile.notifyOnNewEpisodes
                ? "Disable email notifications for new episodes"
                : "Enable email notifications for new episodes"}
            </span>
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                profile.notifyOnNewEpisodes ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>

          <span className="text-sm text-gray-700">
            Email me when new episodes are available
          </span>
        </div>

        {notifStatus && (
          <p
            id={notifStatusId}
            role="status"
            aria-live="polite"
            className="mt-2 text-sm text-green-700"
          >
            {notifStatus}
          </p>
        )}
      </section>

      {/* Change Password */}
      <section aria-labelledby="pw-heading" className="mb-10">
        <h2 id="pw-heading" className="text-xl font-semibold mb-4">
          Change password
        </h2>

        {pwError && (
          <div
            id={pwErrorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded text-sm"
          >
            {pwError}
          </div>
        )}

        {pwStatus && (
          <p role="status" aria-live="polite" className="mb-4 text-sm text-green-700">
            {pwStatus}
          </p>
        )}

        <form
          onSubmit={handleChangePassword}
          aria-describedby={pwError ? pwErrorId : undefined}
          className="space-y-4 max-w-md"
          noValidate
        >
          <div>
            <label
              htmlFor={currentPasswordId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current password
            </label>
            <input
              id={currentPasswordId}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-required="true"
            />
          </div>

          <div>
            <label
              htmlFor={newPasswordId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New password{" "}
              <span className="text-gray-500 font-normal">(min. 8 characters)</span>
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
            />
          </div>

          <button
            type="submit"
            disabled={pwSubmitting}
            className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
          >
            {pwSubmitting ? "Changing password…" : "Change password"}
          </button>
        </form>
      </section>

      {/* Change Email */}
      <section aria-labelledby="email-heading" className="mb-10">
        <h2 id="email-heading" className="text-xl font-semibold mb-1">
          Email address
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Current:{" "}
          <span className="font-medium text-gray-900">{currentUser.email as string}</span>
        </p>

        {emailError && (
          <div
            id={emailErrorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded text-sm"
          >
            {emailError}
          </div>
        )}

        {emailStatus && emailStep === "idle" && (
          <p role="status" aria-live="polite" className="mb-4 text-sm text-green-700">
            {emailStatus}
          </p>
        )}

        {emailStep === "idle" && !emailStatus && (
          <form
            onSubmit={handleRequestEmailChange}
            className="space-y-4 max-w-md"
            noValidate
          >
            <div>
              <label
                htmlFor={newEmailId}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New email address
              </label>
              <input
                id={newEmailId}
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                aria-required="true"
                aria-describedby={emailError ? emailErrorId : undefined}
              />
            </div>
            <button
              type="submit"
              disabled={emailStep === "submitting"}
              className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
            >
              Send verification code
            </button>
          </form>
        )}

        {emailStep === "submitting" && (
          <p aria-live="polite" className="text-sm text-gray-600">
            Sending code…
          </p>
        )}

        {emailStep === "code-sent" && (
          <>
            {emailStatus && (
              <p role="status" aria-live="polite" className="mb-4 text-sm text-green-700">
                {emailStatus}
              </p>
            )}
            <form
              onSubmit={handleConfirmEmailChange}
              aria-describedby={emailError ? emailErrorId : undefined}
              className="space-y-4 max-w-md"
              noValidate
            >
              <div>
                <label
                  htmlFor={emailCodeId}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Verification code
                </label>
                <input
                  id={emailCodeId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  required
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg tracking-widest"
                  aria-required="true"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
                >
                  Confirm email change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep("idle");
                    setEmailCode("");
                    setEmailError("");
                    setEmailStatus("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {/* Delete Account */}
      <section aria-labelledby="delete-heading" className="border-t border-gray-200 pt-8">
        <h2 id="delete-heading" className="text-xl font-semibold mb-2 text-red-700">
          Delete account
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Permanently deletes your account, all subscriptions, and listening history. This
          cannot be undone.
        </p>

        {deleteError && (
          <div
            id={deleteErrorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded text-sm"
          >
            {deleteError}
          </div>
        )}

        {deleteStep === "idle" && (
          <button
            type="button"
            onClick={() => setDeleteStep("confirm")}
            className="px-4 py-2 border border-red-600 text-red-700 text-sm font-semibold rounded hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
          >
            Delete my account
          </button>
        )}

        {deleteStep === "confirm" && (
          <div
            role="alertdialog"
            aria-labelledby="delete-confirm-heading"
            aria-describedby="delete-confirm-desc"
            className="p-4 bg-red-50 border border-red-300 rounded max-w-md"
          >
            <p id="delete-confirm-heading" className="font-semibold text-red-800 mb-1">
              Are you sure?
            </p>
            <p id="delete-confirm-desc" className="text-sm text-red-700 mb-4">
              This will permanently delete your account and all your data.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 transition-colors"
              >
                Yes, delete my account
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteStep("idle");
                  setDeleteError("");
                }}
                className="px-4 py-2 text-sm text-gray-600 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
