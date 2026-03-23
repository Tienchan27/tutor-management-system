function Input({ label, icon, ...props }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          border: '3px solid #8B6F47',
          borderRadius: 16,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
        }}
      >
        {icon ? <span style={{ marginRight: 8 }}>{icon}</span> : null}
        <input
          {...props}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            padding: '10px 0',
            background: 'transparent',
          }}
        />
      </div>
    </label>
  );
}

export default Input;
