import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    const redirect = {
      super_admin: '/admin',
      teacher: '/teacher',
      student: '/student',
    };
    return <Navigate to={redirect[user.role]} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedIn = await login(email, password);
      window.location.href = {
        super_admin: '/admin',
        teacher: '/teacher',
        student: '/student',
      }[loggedIn.role];
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>School Portal</h1>
        <p className="subtitle">Sign in to your account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@school.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-accounts">
          <p>Demo accounts (click to fill):</p>
          <button type="button" className="demo-btn" onClick={() => quickLogin('admin@school.com', 'admin123')}>
            Super Admin
          </button>
          <button type="button" className="demo-btn" onClick={() => quickLogin('teacher@school.com', 'teacher123')}>
            Teacher
          </button>
          <button type="button" className="demo-btn" onClick={() => quickLogin('student@school.com', 'student123')}>
            Student
          </button>
        </div>
      </div>
    </div>
  );
}
