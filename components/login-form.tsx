"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  async function send() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.retryAfter) setResendAt(Date.now() + data.retryAfter * 1000);
        throw new Error(data.error || "Could not send your code.");
      }
      setChallenge(data.challengeId);
      setDevelopmentCode(data.developmentCode || "");
      setCode("");
      setResendAt(Date.now() + data.resendAfter * 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge, code }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not verify your code.");
      router.replace(next);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-form">
      <span className="login-step">
        {challenge ? "STEP 02 / VERIFY YOUR NUMBER" : "LET’S GET YOU STARTED"}
      </span>
      <h1>{challenge ? "Check your phone." : "Welcome to Margyn."}</h1>
      <p className="login-intro">
        {challenge
          ? `Enter the 6-digit code for +91 ${phone}. It expires in 5 minutes.`
          : "A better way to pack starts here. Log in or create an account with your phone number."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (challenge) void verify();
          else void send();
        }}
      >
        {challenge ? (
          <>
            <label htmlFor="otp">Verification code</label>
            <input
              className="otp-input"
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              autoFocus
            />
            <div className="resend-row">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setChallenge("");
                  setCode("");
                  setError("");
                  setDevelopmentCode("");
                }}
                disabled={busy}
              >
                Change number
              </button>
              <button
                className="text-button"
                type="button"
                onClick={send}
                disabled={busy || remaining > 0}
              >
                {remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
              </button>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="phone">Mobile number</label>
            <div className="phone-input">
              <span className="country-prefix">
                <span className="india-flag" /> +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="Your 10-digit mobile number"
                required
                pattern="[6-9][0-9]{9}"
                minLength={10}
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
              />
            </div>
            <p className="field-help">
              We’ll send a one-time code to verify it.
            </p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {developmentCode && (
          <div className="development-notice">
            <strong>Local development mode</strong>
            <span>
              No SMS was sent. Your test code is <b>{developmentCode}</b>.
            </span>
          </div>
        )}
        <button
          className="button button-orange login-submit"
          type="submit"
          disabled={busy || (!challenge && remaining > 0)}
        >
          {busy
            ? "Please wait…"
            : challenge
              ? "Verify & continue"
              : remaining > 0
                ? `Try again in ${remaining}s`
                : "Get verification code"}
          <Icon name="arrow" size={19} />
        </button>
      </form>
      <div className="login-safe">
        <Icon name="shield" size={18} />
        <span>No passwords to remember. Your number stays private.</span>
      </div>
      <p className="login-footnote">
        New here? Your account is created automatically after verification.
      </p>
    </div>
  );
}
