import { FormEvent, useEffect, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { extractApiErrorMessage, resendOtp, verifyOtp } from '../../services/authService';

const RESEND_COOLDOWN_SECONDS = 60;

interface OTPVerificationProps {
  email: string;
  title?: string;
  submitLabel?: string;
  onVerify?: (otp: string) => Promise<void>;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onCancel?: () => void;
  /** When false, hides Resend (e.g. Google link OTP — use Sign in with Google again for a new code). */
  allowResend?: boolean;
  cancelLabel?: string;
}

function OTPVerification({
  email,
  title,
  submitLabel,
  onVerify,
  onSuccess,
  onError,
  onCancel,
  allowResend,
  cancelLabel = 'Use a different email',
}: OTPVerificationProps) {
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const showResend = allowResend !== false && !onVerify;

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  async function handleResend(): Promise<void> {
    if (resendCooldown > 0 || resendLoading || !email) {
      return;
    }
    setResendLoading(true);
    try {
      await resendOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error: unknown) {
      onError?.(extractApiErrorMessage(error, 'Failed to resend OTP'));
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    try {
      if (onVerify) {
        await onVerify(otp);
      } else {
        await verifyOtp({ email, otp });
      }
      onSuccess?.();
    } catch (error: unknown) {
      onError?.(extractApiErrorMessage(error, 'OTP verification failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {title ? <h3 className="section-title">{title}</h3> : null}
      <p className="otp-hint">Enter the OTP sent to: {email}</p>
      <Input
        label="One-Time Password"
        value={otp}
        placeholder="Enter 6-digit code"
        onChange={(e) => setOtp(e.target.value)}
        required
      />
      <Button type="submit" loading={loading}>
        {submitLabel || 'Verify OTP'}
      </Button>
      <div className="otp-inline-actions">
        {showResend ? (
          <button
            type="button"
            className="auth-link"
            disabled={resendLoading || resendCooldown > 0}
            onClick={() => void handleResend()}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resendLoading
                ? 'Sending…'
                : 'Resend code'}
          </button>
        ) : null}
        {onCancel ? (
          <button type="button" className="auth-link" onClick={onCancel}>
            {cancelLabel}
          </button>
        ) : null}
      </div>
      {onVerify && !showResend ? (
        <p className="muted otp-google-hint">Need a new code? Go back and sign in with Google again.</p>
      ) : null}
    </form>
  );
}

export default OTPVerification;
