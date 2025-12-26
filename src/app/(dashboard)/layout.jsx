import PropTypes from 'prop-types';
import DashboardLayout from '@/layout/Dashboard';
import AuthGuard from '@/components/auth/AuthGuard';

// ==============================|| DASHBOARD LAYOUT ||============================== //

export default function Layout({ children }) {
  return (
    <AuthGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}

Layout.propTypes = { children: PropTypes.node };
