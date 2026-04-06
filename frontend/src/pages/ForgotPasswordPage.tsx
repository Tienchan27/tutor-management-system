import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { extractApiErrorMessage, forgotPassword, resetPassword } from '../services/authService';
import { clearPendingPasswordReset, getPendingPasswordReset, setPendingPasswordReset } from '../utils/pendingAuthStorage';

type Step = 'email' | 'reset';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetEmail = (location.state as { email?: string } | null)?.email;
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState<string>(presetEmail ?? '');
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const OTP_EXPIRY_MINUTES_FE = 5;
  const otpExpiresAtMs = (requestedAt: number) => requestedAt + OTP_EXPIRY_MINUTES_FE * 60 * 1000;

  useEffect(() => {
    const pending = getPendingPasswordReset();
    if (!pending) {
      return;
    }
    const expiresAt = otpExpiresAtMs(pending.requestedAt);
    if (Date.now() <= expiresAt) {
      setEmail(pending.email);
      setStep('reset');
      setError('');
      setInfo('');
      return;
    }
    clearPendingPasswordReset();
    setStep('email');
    setError('OTP expired. Please send a new code.');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setInfo('');
  }, []);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await forgotPassword({ email: trimmed });
      setInfo(res.message);
      setPendingPasswordReset(trimmed, Date.now());
      setStep('reset');
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Could not send reset code'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      clearPendingPasswordReset();
      navigate('/', { replace: true, state: { passwordReset: true } });
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-layout">
        <Card featured className="auth-card">
          <div className="auth-head">
            <h1 className="title title-xl title-accent">Reset password</h1>
            <p className="subtitle">
              {step === 'email'
                ? 'Enter your account email. We will send a verification code if the account exists.'
                : 'Enter the code from your email and choose a new password.'}
            </p>
          </div>

          {step === 'email' ? (
            <form className="auth-form" onSubmit={(e) => void handleEmailSubmit(e)}>
              <Input
                label="Email"
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error ? <p className="error-text">{error}</p> : null}
              <Button type="submit" loading={loading}>
                Send reset code
              </Button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={(e) => void handleResetSubmit(e)}>
              {info ? <p className="muted">{info}</p> : null}
              <Input label="Email" type="email" value={email} readOnly />
              <Input
                label="Verification code"
                value={otp}
                placeholder="6-digit code"
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <Input
                label="New password"
                type="password"
                value={newPassword}
                placeholder="At least 8 characters"
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                placeholder="Repeat password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
              {error ? <p className="error-text">{error}</p> : null}
              <Button type="submit" loading={loading}>
                Update password
              </Button>
              <div className="auth-form-row" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    clearPendingPasswordReset();
                    setStep('email');
                    setEmail(presetEmail ?? '');
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                    setInfo('');
                  }}
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}

          <p className="muted" style={{ marginTop: 16 }}>
            <Link className="auth-link" to="/">
              Back to sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
