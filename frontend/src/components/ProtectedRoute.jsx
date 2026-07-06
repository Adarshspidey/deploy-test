import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect = {
      super_admin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };
    return <Navigate to={redirect[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}
