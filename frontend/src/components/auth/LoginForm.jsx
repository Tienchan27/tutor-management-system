import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { login } from '../../services/authService';

function LoginForm({ onSuccess, onError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      onSuccess?.();
    } catch (error) {
      onError?.(error?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Email" icon="📧" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        label="Password"
        icon="🔒"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" loading={loading}>
        Dang nhap
      </Button>
    </form>
  );
}

export default LoginForm;
