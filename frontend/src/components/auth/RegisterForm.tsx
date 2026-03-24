import { FormEvent, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { extractApiErrorMessage, register } from '../../services/authService';
import { RegisterPayload } from '../../types/auth';

interface RegisterFormProps {
  onRegistered?: (email: string) => void;
  onError?: (message: string) => void;
}

function RegisterForm({ onRegistered, onError }: RegisterFormProps) {
  const [form, setForm] = useState<RegisterPayload>({ name: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const passwordMismatch = useMemo<boolean>(() => confirmPassword.length > 0 && form.password !== confirmPassword, [confirmPassword, form.password]);

  function updateField<K extends keyof RegisterPayload>(name: K, value: RegisterPayload[K]): void {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (passwordMismatch) {
      onError?.('Password and confirmation do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      onRegistered?.(form.email);
    } catch (error: unknown) {
      onError?.(extractApiErrorMessage(error, 'Register failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <Input
        label="Full Name"
        value={form.name}
        placeholder="Your full name"
        onChange={(e) => updateField('name', e.target.value)}
        required
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        placeholder="you@example.com"
        onChange={(e) => updateField('email', e.target.value)}
        required
      />
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={form.password}
        placeholder="Create a password"
        onChange={(e) => updateField('password', e.target.value)}
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
      <Input
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        placeholder="Re-enter password"
        onChange={(e) => setConfirmPassword(e.target.value)}
        endAdornment={
          <button
            className="field-toggle"
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        }
        errorText={passwordMismatch ? 'Passwords do not match' : undefined}
        required
      />
      <Button type="submit" loading={loading} disabled={passwordMismatch}>
        Create Account
      </Button>
    </form>
  );
}

export default RegisterForm;
