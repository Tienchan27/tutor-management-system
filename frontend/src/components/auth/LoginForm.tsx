import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ApiErrorResponse } from '../../types/auth';
import { extractApiErrorMessage, login } from '../../services/authService';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  /** When login succeeds on password but email is not verified (backend code PENDING_VERIFICATION). */
  onPendingVerification?: (email: string) => void;
}

function LoginForm({ onSuccess, onError, onPendingVerification }: LoginFormProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      onSuccess?.();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const code = (error.response?.data as ApiErrorResponse | undefined)?.code;
        if (code === 'PENDING_VERIFICATION' && onPendingVerification) {
          onPendingVerification(email.trim());
          return;
        }
        if (code === 'INVALID_EMAIL' || code === 'INVALID_PASSWORD') {
          onError?.('Invalid email or password');
          return;
        }
      }
      onError?.(extractApiErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={email}
        placeholder="you@example.com"
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        placeholder="Enter your password"
        onChange={(e) => setPassword(e.target.value)}
        endAdornment={
          <button
            className="field-toggle"
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        }
        required
      />
      <div className="auth-form-row">
        <Link className="auth-link" to="/forgot-password" state={{ email }}>
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={loading}>
        Sign In
      </Button>
    </form>
  );
}

export default LoginForm;
