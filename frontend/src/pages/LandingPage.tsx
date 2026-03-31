import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import OTPVerification from '../components/auth/OTPVerification';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { getAuthUser, isAuthenticated, saveAuthSession } from '../utils/storage';
import { googleLogin } from '../services/googleAuth';
import { ApiErrorResponse } from '../types/auth';
import { verifyGoogleLinkOtp } from '../services/authService';

type AuthTab = 'login' | 'register';

function LandingPage() {
  const [tab, setTab] = useState<AuthTab>('login');
  const [error, setError] = useState<string>('');
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [googleLinkChallenge, setGoogleLinkChallenge] = useState<{ email: string; idToken: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      routeByProfileFlag();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setGoogleLinkChallenge({
          email: response.challengeEmail || response.email,
          idToken,
        });
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
          </div>

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

          {otpEmail ? (
            <OTPVerification email={otpEmail} onSuccess={routeByProfileFlag} onError={setError} />
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
                setGoogleLinkChallenge(null);
              }}
              onSuccess={routeByProfileFlag}
              onError={setError}
            />
          ) : tab === 'login' ? (
            <LoginForm onSuccess={routeByProfileFlag} onError={setError} />
          ) : (
            <RegisterForm onRegistered={setOtpEmail} onError={setError} />
          )}

          <div className="auth-separator">or</div>
          <GoogleSignInButton onSuccess={handleGoogleLogin} onError={(err) => setError(err.message)} />

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
