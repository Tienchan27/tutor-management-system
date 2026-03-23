const styles = {
  primary: {
    background: '#E4572E',
    color: '#fff',
    border: '3px solid #D6452F',
  },
  secondary: {
    background: '#FAF3E0',
    color: '#2D3748',
    border: '3px solid #8B6F47',
  },
  outline: {
    background: 'transparent',
    color: '#2D3748',
    border: '3px dashed #8B6F47',
  },
};

function Button({ children, type = 'button', variant = 'primary', disabled, loading, onClick }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...styles[variant],
        borderRadius: '22px',
        padding: '10px 16px',
        fontWeight: 700,
        textTransform: 'uppercase',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: '100%',
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

export default Button;
