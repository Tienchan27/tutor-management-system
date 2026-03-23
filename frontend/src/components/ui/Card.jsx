function Card({ children, featured = false }) {
  return (
    <div
      style={{
        background: featured ? '#FFF4D6' : '#FAF3E0',
        border: '4px solid #8B6F47',
        borderRadius: '24px',
        padding: 18,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
