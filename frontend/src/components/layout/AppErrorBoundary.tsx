import { Component, ReactNode } from 'react';
import { clearAuthSession } from '../../utils/storage';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  handleLogout = (): void => {
    clearAuthSession();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="container">
            <div className="card">
              <h2 className="title title-lg">Something went wrong</h2>
              <p className="subtitle">Please refresh the page. If the issue persists, log out and sign in again.</p>
              <div className="form-actions">
                <button type="button" className="btn btn-brand compact-btn" onClick={this.handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;

