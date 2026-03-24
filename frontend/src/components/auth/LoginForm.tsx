import { FormEvent, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { extractApiErrorMessage, login } from '../../services/authService';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

function LoginForm({ onSuccess, onError }: LoginFormProps) {
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
        <a className="auth-link" href="#forgot-password" onClick={(event) => event.preventDefault()}>
          Forgot password?
        </a>
      </div>
      <Button type="submit" loading={loading}>
        Sign In
      </Button>
    </form>
  );
}

export default LoginForm;
