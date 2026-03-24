import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import OTPVerification from '../components/auth/OTPVerification';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { getAuthUser, isAuthenticated } from '../utils/storage';
import { googleLogin } from '../services/googleAuth';
import { ApiErrorResponse } from '../types/auth';

type AuthTab = 'login' | 'register';

function LandingPage() {
  const [tab, setTab] = useState<AuthTab>('login');
  const [error, setError] = useState<string>('');
  const [otpEmail, setOtpEmail] = useState<string>('');
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
    navigate('/dashboard');
  }

  async function handleGoogleLogin(idToken: string): Promise<void> {
    try {
      setError('');
      await googleLogin(idToken);
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
            <h1 className="title title-xl">Welcome Back</h1>
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
            <button type="button" onClick={() => navigate('/api-tester')} className="auth-link-button">
              API Tester
            </button>
          </div>

          {otpEmail ? (
            <OTPVerification email={otpEmail} onSuccess={routeByProfileFlag} onError={setError} />
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
          <h2 className="title title-lg">Tutor Management System</h2>
          <p className="subtitle">A clean workspace for authentication, profile setup, and API testing.</p>
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
              <Badge>API Testing</Badge>
              <span className="muted">Fast endpoint validation from the UI.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default LandingPage;
