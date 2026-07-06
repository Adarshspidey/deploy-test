import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Layout from '../../components/Layout';

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/student/assignments')
      .then((res) => setAssignments(res.data))
      .catch(() => setError('Failed to load assignments'));
  }, []);

  const filtered = assignments.filter((a) => {
    if (filter === 'pending') return !a.completed;
    if (filter === 'completed') return a.completed;
    return true;
  });

  return (
    <Layout title="Student Dashboard">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button type="button" className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>
          All ({assignments.length})
        </button>
        <button type="button" className={filter === 'pending' ? 'tab active' : 'tab'} onClick={() => setFilter('pending')}>
          Pending ({assignments.filter((a) => !a.completed).length})
        </button>
        <button type="button" className={filter === 'completed' ? 'tab active' : 'tab'} onClick={() => setFilter('completed')}>
          Completed ({assignments.filter((a) => a.completed).length})
        </button>
      </div>

      <section className="card">
        <h2>Assignments</h2>
        {filtered.length === 0 ? (
          <p className="empty">No assignments found</p>
        ) : (
          <div className="assignment-grid">
            {filtered.map((a) => (
              <div key={a.id} className={`assignment-card ${a.completed ? 'completed' : ''}`}>
                <div className="assignment-card-header">
                  <h3>{a.title}</h3>
                  <span className={`status-badge ${a.completed ? 'done' : 'pending'}`}>
                    {a.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                {a.description && <p className="muted">{a.description}</p>}
                <div className="assignment-meta">
                  <span>Teacher: {a.teacher_name}</span>
                  <span>{a.total_questions} questions</span>
                </div>
                {a.completed ? (
                  <div className="score-display">
                    Score: <strong>{a.score}/{a.total}</strong>
                    <span className="percentage">({Math.round((a.score / a.total) * 100)}%)</span>
                  </div>
                ) : null}
                <div className="assignment-actions">
                  {a.completed ? (
                    <Link to={`/student/assignments/${a.id}/result`} className="btn btn-primary">
                      View Results
                    </Link>
                  ) : (
                    <Link to={`/student/assignments/${a.id}`} className="btn btn-primary">
                      Take Assignment
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
