import { FormEvent, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { extractApiErrorMessage, verifyOtp } from '../../services/authService';

interface OTPVerificationProps {
  email: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

function OTPVerification({ email, onSuccess, onError }: OTPVerificationProps) {
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    try {
      await verifyOtp({ email, otp });
      onSuccess?.();
    } catch (error: unknown) {
      onError?.(extractApiErrorMessage(error, 'OTP verification failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="otp-hint">Enter the OTP sent to: {email}</p>
      <Input
        label="One-Time Password"
        value={otp}
        placeholder="Enter 6-digit code"
        onChange={(e) => setOtp(e.target.value)}
        required
      />
      <Button type="submit" loading={loading}>
        Verify OTP
      </Button>
    </form>
  );
}

export default OTPVerification;
