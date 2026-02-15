"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
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

  // Notification preference
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState("");

  // Change password
  const [pwStep, setPwStep] = useState<"idle" | "sent" | "changing">("idle");
  const [pwCode, setPwCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwStatus, setPwStatus] = useState("");

  // Delete account
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleteError, setDeleteError] = useState("");

  const codeId = useId();
  const newPasswordId = useId();
  const pwErrorId = useId();
  const deleteErrorId = useId();
  const notifStatusId = useId();

  // Redirect unauthenticated users
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

  const handleSendResetCode = async () => {
    setPwError("");
    setPwStatus("");
    setPwStep("changing");
    try {
      await signIn("password", {
        email: currentUser.email as string,
        flow: "reset",
      });
      setPwStep("sent");
      setPwStatus("Reset code sent to your email.");
    } catch {
      setPwError("Failed to send reset code. Please try again.");
      setPwStep("idle");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    setPwStep("changing");
    try {
      await signIn("password", {
        email: currentUser.email as string,
        code: pwCode,
        newPassword,
        flow: "reset-verification",
      });
      setPwStep("idle");
      setPwCode("");
      setNewPassword("");
      setPwStatus("Password changed successfully.");
    } catch {
      setPwError("Invalid or expired code. Please try again.");
      setPwStep("sent");
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

        {pwStatus && pwStep === "idle" && (
          <p role="status" aria-live="polite" className="mb-4 text-sm text-green-700">
            {pwStatus}
          </p>
        )}

        {pwStep === "idle" && (
          <button
            type="button"
            onClick={handleSendResetCode}
            className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
          >
            Send password reset code to my email
          </button>
        )}

        {pwStep === "changing" && (
          <p aria-live="polite" className="text-sm text-gray-600">
            Sending code…
          </p>
        )}

        {pwStep === "sent" && (
          <>
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
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value)}
                  required
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg tracking-widest"
                  aria-required="true"
                />
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
                >
                  Set new password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPwStep("idle");
                    setPwCode("");
                    setNewPassword("");
                    setPwError("");
                    setPwStatus("");
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
            <p
              id="delete-confirm-heading"
              className="font-semibold text-red-800 mb-1"
            >
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
