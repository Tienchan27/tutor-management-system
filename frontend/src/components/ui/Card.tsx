import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  featured?: boolean;
  className?: string;
}

function Card({ children, featured = false, className = '' }: CardProps) {
  return <div className={`card ${featured ? 'card-featured' : ''} ${className}`.trim()}>{children}</div>;
}

export default Card;
