interface PlaceholderPageProps {
  title: string;
  description: string;
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="card">
      <h2 className="title title-lg">{title}</h2>
      <p className="subtitle">{description}</p>
      <p className="muted">This module is not available yet because the backend API for this domain is not published.</p>
    </div>
  );
}

export default PlaceholderPage;
