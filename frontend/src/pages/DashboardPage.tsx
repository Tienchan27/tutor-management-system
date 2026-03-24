import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import { clearAuthSession, getAuthUser } from '../utils/storage';
import { logout } from '../services/authService';
import { UserProfile } from '../types/auth';

function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const user = getAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProfile(): Promise<void> {
      try {
        const response = await api.get<UserProfile>('/users/me/profile');
        setProfile(response.data);
      } catch (error: unknown) {
        const status = (error as AxiosError)?.response?.status;
        if (status === 401 || status === 403) {
          clearAuthSession();
          navigate('/');
        }
      }
    }
    loadProfile();
  }, [navigate]);

  async function handleLogout(): Promise<void> {
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
        <h1 className="title">Dashboard</h1>
        <p className="subtitle">Welcome back, {profile?.name || user?.name || user?.email}.</p>

        <div className="grid-3" style={{ marginTop: 18 }}>
          <Card featured>
            <h3 className="title section-title-lg">User Profile</h3>
            <p>Email: {profile?.email || user?.email}</p>
            <p>Phone: {profile?.phoneNumber || 'Not provided'}</p>
          </Card>
          <Card>
            <h3 className="title section-title-lg">Status</h3>
            <div className="badge-row">
              <Badge>Authenticated</Badge>
              <Badge>Profile Ready</Badge>
            </div>
          </Card>
          <Card>
            <h3 className="title section-title-lg">Session</h3>
            <Button onClick={handleLogout}>Logout</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
