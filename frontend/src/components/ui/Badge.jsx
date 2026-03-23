function Badge({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: 999,
        background: '#FFB88C',
        border: '2px solid #D6452F',
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
