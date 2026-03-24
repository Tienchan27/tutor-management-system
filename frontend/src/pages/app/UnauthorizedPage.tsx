function UnauthorizedPage() {
  return (
    <div className="card">
      <h2 className="title title-lg">Unauthorized</h2>
      <p className="subtitle">Your current role does not have permission to access this page.</p>
    </div>
  );
}

export default UnauthorizedPage;
