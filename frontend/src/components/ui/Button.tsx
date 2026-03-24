import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
}

function Button({ children, type = 'button', variant = 'primary', disabled, loading, className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`btn btn-${variant} ${className}`.trim()}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

export default Button;
