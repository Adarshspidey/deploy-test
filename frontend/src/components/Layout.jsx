import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();

  const roleLabels = {
    super_admin: 'Super Admin',
    teacher: 'Teacher',
    student: 'Student',
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="logo">School Portal</Link>
          {title && <span className="page-title">{title}</span>}
        </div>
        <div className="header-right">
          <span className="user-badge">
            {user?.full_name} · {roleLabels[user?.role]}
          </span>
          <button type="button" className="btn btn-outline" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
