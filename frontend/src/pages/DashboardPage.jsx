import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import { clearAuthSession, getAuthUser } from '../utils/storage';
import { logout } from '../services/authService';

function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const user = getAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/users/me/profile');
        setProfile(response.data);
      } catch {
        clearAuthSession();
        navigate('/');
      }
    }
    loadProfile();
  }, [navigate]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearAuthSession();
      navigate('/');
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="title">🏆 Dashboard</h1>
        <p className="subtitle">Chao mung {profile?.name || user?.name || user?.email} quay tro lai!</p>

        <div className="grid-3" style={{ marginTop: 18 }}>
          <Card featured>
            <h3 className="title" style={{ fontSize: 18 }}>
              User Info
            </h3>
            <p>Email: {profile?.email || user?.email}</p>
            <p>Phone: {profile?.phoneNumber || 'Chua cap nhat'}</p>
          </Card>
          <Card>
            <h3 className="title" style={{ fontSize: 18 }}>
              Achievement
            </h3>
            <div className="badge-row">
              <Badge>📚 Active Learner</Badge>
              <Badge>🎯 Weekly Goal</Badge>
            </div>
          </Card>
          <Card>
            <h3 className="title" style={{ fontSize: 18 }}>
              Session
            </h3>
            <Button onClick={handleLogout}>Logout</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
