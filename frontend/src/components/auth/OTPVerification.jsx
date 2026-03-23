import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { verifyOtp } from '../../services/authService';

function OTPVerification({ email, onSuccess, onError }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await verifyOtp({ email, otp });
      onSuccess?.();
    } catch (error) {
      onError?.(error?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ marginTop: 0, color: '#4A5568' }}>Nhap OTP da gui ve email: {email}</p>
      <Input label="OTP" icon="🔐" value={otp} onChange={(e) => setOtp(e.target.value)} />
      <Button type="submit" loading={loading}>
        Xac thuc OTP
      </Button>
    </form>
  );
}

export default OTPVerification;
