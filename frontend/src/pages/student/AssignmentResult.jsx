import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import Layout from '../../components/Layout';

export default function AssignmentResult() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/student/assignments/${id}/result`)
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load results'));
  }, [id]);

  if (!result && !error) {
    return <Layout title="Loading..."><div className="loading">Loading results...</div></Layout>;
  }

  if (error) {
    return (
      <Layout title="Error">
        <div className="alert alert-error">{error}</div>
        <Link to="/student" className="btn btn-outline">Back to Dashboard</Link>
      </Layout>
    );
  }

  return (
    <Layout title="Assignment Results">
      <section className="card result-card">
        <h2>{result.assignment_title}</h2>
        <div className="result-summary">
          <div className="score-circle">
            <span className="score-value">{result.percentage}%</span>
            <span className="score-label">{result.score}/{result.total_questions} correct</span>
          </div>
          <p className="muted">Submitted on {new Date(result.submitted_at).toLocaleString()}</p>
        </div>

        <h3>Answer Review</h3>
        {result.answers.map((a, index) => (
          <div key={a.question_id} className={`review-item ${a.is_correct ? 'correct' : 'incorrect'}`}>
            <div className="review-header">
              <strong>{index + 1}. {a.question_text}</strong>
              <span className={`review-badge ${a.is_correct ? 'correct' : 'incorrect'}`}>
                {a.is_correct ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            <p>Your answer: <strong>{a.selected_option}</strong></p>
            {!a.is_correct && (
              <p>Correct answer: <strong>{a.correct_option}</strong></p>
            )}
          </div>
        ))}

        <Link to="/student" className="btn btn-primary">Back to Dashboard</Link>
      </section>
    </Layout>
  );
}
