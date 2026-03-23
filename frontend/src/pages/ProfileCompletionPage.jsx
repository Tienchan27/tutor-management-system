import { useNavigate } from 'react-router-dom';
import ProfileCompletion from '../components/profile/ProfileCompletion';
import { getAuthUser } from '../utils/storage';

function ProfileCompletionPage() {
  const user = getAuthUser();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <p style={{ fontWeight: 700, marginBottom: 16 }}>Progress: [✓] → [●] → [ ]</p>
        <ProfileCompletion user={user} onCompleted={() => navigate('/dashboard')} onError={(message) => window.alert(message)} />
      </div>
    </div>
  );
}

export default ProfileCompletionPage;
