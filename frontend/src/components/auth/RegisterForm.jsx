import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { register } from '../../services/authService';

function RegisterForm({ onRegistered, onError }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await register(form);
      onRegistered?.(form.email);
    } catch (error) {
      onError?.(error?.response?.data?.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Ho ten" icon="👤" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
      <Input
        label="Email"
        icon="📧"
        type="email"
        value={form.email}
        onChange={(e) => updateField('email', e.target.value)}
      />
      <Input
        label="Password"
        icon="🔒"
        type="password"
        value={form.password}
        onChange={(e) => updateField('password', e.target.value)}
      />
      <Button type="submit" loading={loading}>
        Dang ky
      </Button>
    </form>
  );
}

export default RegisterForm;
