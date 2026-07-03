import { NavLink, Outlet } from 'react-router-dom';
import PageLayout from '../../../../components/layout/PageLayout';

function TutorEarningsLayout() {
  return (
    <PageLayout title="Earnings" subtitle="Payout history and bank accounts for salary transfers.">
      <nav className="subnav-tabs" aria-label="Earnings sections">
        <NavLink
          to="/app/tutor/earnings/payouts"
          className={({ isActive }) => `subnav-tab${isActive ? ' active' : ''}`}
          end
        >
          Payouts
        </NavLink>
        <NavLink
          to="/app/tutor/earnings/bank"
          className={({ isActive }) => `subnav-tab${isActive ? ' active' : ''}`}
        >
          Bank accounts
        </NavLink>
      </nav>
      <Outlet />
    </PageLayout>
  );
}

export default TutorEarningsLayout;
