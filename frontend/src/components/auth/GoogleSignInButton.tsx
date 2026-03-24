import { CredentialResponse, GoogleLogin } from '@react-oauth/google';

interface GoogleSignInButtonProps {
  onSuccess?: (idToken: string) => void;
  onError?: (error: Error) => void;
}

function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  function handleSuccess(credentialResponse: CredentialResponse): void {
    if (credentialResponse.credential) {
      onSuccess?.(credentialResponse.credential);
      return;
    }
    onError?.(new Error('Google sign in failed'));
  }

  return (
    <div className="google-signin">
      <div className="google-signin-label">Or continue with Google</div>
      <GoogleLogin onSuccess={handleSuccess} onError={() => onError?.(new Error('Google sign in failed'))} />
    </div>
  );
}

export default GoogleSignInButton;
