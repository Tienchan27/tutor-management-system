import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  endAdornment?: ReactNode;
  helperText?: string;
  errorText?: string;
}

function Input({ label, icon, endAdornment, helperText, errorText, className = '', ...props }: InputProps) {
  return (
    <label className="input-wrapper">
      <span className="input-label">{label}</span>
      <span className={`input-frame ${errorText ? 'input-error' : ''}`}>
        {icon ? <span className="input-icon">{icon}</span> : null}
        <input className={`input-control ${className}`.trim()} {...props} />
        {endAdornment ? <span className="input-end">{endAdornment}</span> : null}
      </span>
      {errorText ? <span className="input-helper input-helper-error">{errorText}</span> : null}
      {!errorText && helperText ? <span className="input-helper">{helperText}</span> : null}
    </label>
  );
}

export default Input;
