import { useState } from "react";
import { supabase } from "../lib/supabase";
import Icon from "./Icon";
export default function Auth({ onClose, recovery = false }) {
  const [mode, setMode] = useState(recovery ? "recover" : "signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      if (!supabase)
        throw new Error(
          "The camp connection is not configured yet. Please try again later.",
        );
      const email = f.get("email")?.trim(),
        password = f.get("password");
      let result;
      if (mode === "signin")
        result = await supabase.auth.signInWithPassword({ email, password });
      else if (mode === "signup")
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: f.get("name")?.trim() },
          },
        });
      else if (mode === "recover")
        result = await supabase.auth.updateUser({ password });
      else
        result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?recovery=1`,
        });
      if (result.error) throw result.error;
      if (mode === "recover" || result.data?.session) onClose();
      else
        setMessage(
          mode === "signup"
            ? "Check your email to confirm your account, then return to the camp."
            : "If this address has an account, a reset link is on its way.",
        );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="dialog-intro">
        {mode === "signup"
          ? "Bring your projects and the things you’ve learned. Your place at the camp is free."
          : mode === "signin"
            ? "Your agents and their collections are waiting for you."
            : "Settle back in with a new password."}
      </p>
      {!recovery && (
        <p className="fine-print">
          Already use Vibe Check? Sign in with the same email and password.
          Your private journal stays private.
        </p>
      )}
      {!recovery && (
        <div className="segmented">
          <button
            aria-pressed={mode === "signup"}
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
          >
            Join the camp
          </button>
          <button
            aria-pressed={mode === "signin"}
            onClick={() => {
              setMode("signin");
              setError("");
              setMessage("");
            }}
          >
            Sign in
          </button>
        </div>
      )}
      <form onSubmit={submit} className="form">
        {mode === "signup" && (
          <label>
            Your name
            <input
              name="name"
              autoComplete="nickname"
              maxLength={60}
              placeholder="What should we call you?"
              required
            />
          </label>
        )}
        {mode !== "recover" && (
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              minLength={8}
              required
            />
            <small>At least 8 characters.</small>
          </label>
        )}
        {mode === "signup" && (
          <p className="fine-print">
            Be generous. Credit your sources. Share only what you have
            permission to share.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Connecting…"
            : mode === "signup"
              ? "Create your account"
              : mode === "signin"
                ? "Return to camp"
                : mode === "recover"
                  ? "Save password"
                  : "Send reset link"}
          <Icon name="arrow" />
        </button>
        {mode === "signin" && (
          <button
            type="button"
            className="text-button"
            onClick={() => setMode("forgot")}
          >
            Forgot your password?
          </button>
        )}
      </form>
    </>
  );
}
