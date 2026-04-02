import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import OTPVerification from '../components/auth/OTPVerification';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { getAuthUser, isAuthenticated, saveAuthSession } from '../utils/storage';
import {
  clearGoogleLinkOtpChallenge,
  clearPendingVerificationEmail,
  getGoogleLinkOtpChallenge,
  getPendingVerificationEmail,
  setGoogleLinkOtpChallenge,
  setPendingVerificationEmail,
} from '../utils/pendingAuthStorage';
import { googleLogin } from '../services/googleAuth';
import { ApiErrorResponse } from '../types/auth';
import { extractApiErrorMessage, resendOtp, verifyGoogleLinkOtp } from '../services/authService';

type AuthTab = 'login' | 'register';

function LandingPage() {
  const [tab, setTab] = useState<AuthTab>('login');
  const [error, setError] = useState<string>('');
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [googleLinkChallenge, setGoogleLinkChallenge] = useState<{ email: string; idToken: string } | null>(null);
  const [passwordResetBanner, setPasswordResetBanner] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const passwordResetHandled = useRef<boolean>(false);

  const showAuthChrome = !otpEmail && !googleLinkChallenge;

  useEffect(() => {
    if (passwordResetHandled.current) {
      return;
    }
    const state = location.state as { passwordReset?: boolean } | null;
    if (state?.passwordReset) {
      passwordResetHandled.current = true;
      setPasswordResetBanner(true);
      setTab('login');
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (isAuthenticated()) {
      routeByProfileFlag();
      return;
    }
    const storedEmail = getPendingVerificationEmail();
    if (storedEmail) {
      setOtpEmail(storedEmail);
      return;
    }
    const storedGoogle = getGoogleLinkOtpChallenge();
    if (storedGoogle) {
      setGoogleLinkChallenge(storedGoogle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegistered(email: string): void {
    setPendingVerificationEmail(email);
    setOtpEmail(email);
  }

  function handleCancelRegisterOtp(): void {
    clearPendingVerificationEmail();
    setOtpEmail('');
    setError('');
  }

  function handleCancelGoogleOtp(): void {
    clearGoogleLinkOtpChallenge();
    setGoogleLinkChallenge(null);
    setError('');
  }

  function handleRegisterOtpSuccess(): void {
    clearPendingVerificationEmail();
    routeByProfileFlag();
  }

  function handleGoogleOtpSuccess(): void {
    clearGoogleLinkOtpChallenge();
    routeByProfileFlag();
  }

  async function handlePendingVerification(email: string): Promise<void> {
    setError('');
    setPendingVerificationEmail(email);
    setOtpEmail(email);
    try {
      await resendOtp(email);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Could not send a new code. You can resend below.'));
    }
  }

  function routeByProfileFlag(): void {
    const user = getAuthUser();
    if (user?.needsProfileCompletion !== false) {
      navigate('/profile-completion');
      return;
    }
    if (user?.needsTutorOnboarding) {
      navigate('/tutor-onboarding');
      return;
    }
    navigate('/app');
  }

  async function handleGoogleLogin(idToken: string): Promise<void> {
    try {
      setError('');
      const response = await googleLogin(idToken);
      if (response.authStatus === 'PENDING_LINK_OTP') {
        const challenge = {
          email: response.challengeEmail || response.email,
          idToken,
        };
        setGoogleLinkOtpChallenge(challenge);
        setGoogleLinkChallenge(challenge);
        return;
      }
      routeByProfileFlag();
    } catch (err: unknown) {
      const message =
        (err as AxiosError<ApiErrorResponse>)?.response?.data?.message || 'Google login failed';
      if (message === 'EMAIL_CONFLICT') {
        setError(
          'This email is already linked to a password account. Sign in with password first, then link Google in account settings.'
        );
        return;
      }
      setError(message);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-layout">
        <Card featured className="auth-card">
          <div className="auth-head">
            <h1 className="title title-xl title-accent">Welcome Back</h1>
            <p className="subtitle">Sign in to manage your tutor operations.</p>
            {passwordResetBanner ? (
              <p className="subtitle" style={{ color: 'var(--cta-teal-dark)', marginTop: 8 }}>
                Password updated. You can sign in with your new password.
              </p>
            ) : null}
          </div>

          {showAuthChrome ? (
            <div className="auth-tabs">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              >
                Sign Up
              </button>
            </div>
          ) : null}

          {otpEmail ? (
            <OTPVerification
              email={otpEmail}
              onSuccess={handleRegisterOtpSuccess}
              onError={setError}
              onCancel={handleCancelRegisterOtp}
              allowResend
            />
          ) : googleLinkChallenge ? (
            <OTPVerification
              email={googleLinkChallenge.email}
              title="Verify Google Link"
              submitLabel="Verify and Link Google"
              onVerify={async (otp: string) => {
                const response = await verifyGoogleLinkOtp({
                  email: googleLinkChallenge.email,
                  idToken: googleLinkChallenge.idToken,
                  otp,
                });
                saveAuthSession(response);
                clearGoogleLinkOtpChallenge();
                setGoogleLinkChallenge(null);
              }}
              onSuccess={handleGoogleOtpSuccess}
              onError={setError}
              onCancel={handleCancelGoogleOtp}
              allowResend={false}
              cancelLabel="Back"
            />
          ) : (
            <>
              {tab === 'login' ? (
                <LoginForm
                  onSuccess={routeByProfileFlag}
                  onError={setError}
                  onPendingVerification={handlePendingVerification}
                />
              ) : (
                <RegisterForm onRegistered={handleRegistered} onError={setError} />
              )}
            </>
          )}

          {showAuthChrome ? (
            <>
              <div className="auth-separator">or</div>
              <GoogleSignInButton onSuccess={handleGoogleLogin} onError={(err) => setError(err.message)} />
            </>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}
        </Card>

        <aside className="auth-side">
          <h2 className="title title-lg title-accent">Tutor Management System</h2>
          <p className="subtitle">A clean operational workspace for admin, tutor, and student workflows.</p>
          <div className="feature-list">
            <div className="feature-item">
              <Badge>Email + Password</Badge>
              <span className="muted">Secure sign-in and registration flow.</span>
            </div>
            <div className="feature-item">
              <Badge>Google Login</Badge>
              <span className="muted">One-click OAuth with conflict handling.</span>
            </div>
            <div className="feature-item">
              <Badge>Role-Based Portal</Badge>
              <span className="muted">Dedicated navigation and workspaces by user role.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default LandingPage;
