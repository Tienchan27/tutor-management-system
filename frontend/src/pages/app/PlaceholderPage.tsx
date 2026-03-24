interface PlaceholderPageProps {
  title: string;
  description: string;
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="card">
      <h2 className="title title-lg">{title}</h2>
      <p className="subtitle">{description}</p>
      <div className="panel">
        <p className="muted">This module is not available yet because the backend API for this domain is not published.</p>
      </div>
    </div>
  );
}

export default PlaceholderPage;
