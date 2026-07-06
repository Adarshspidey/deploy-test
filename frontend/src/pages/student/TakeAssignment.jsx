import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import Layout from '../../components/Layout';

export default function TakeAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/student/assignments/${id}`)
      .then((res) => {
        setAssignment(res.data);
        const initial = {};
        res.data.questions.forEach((q) => { initial[q.id] = ''; });
        setAnswers(initial);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load assignment'));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const unanswered = assignment.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError('Please answer all questions');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: assignment.questions.map((q) => ({
          question_id: q.id,
          selected_option: answers[q.id],
        })),
      };
      await api.post(`/student/assignments/${id}/submit`, payload);
      navigate(`/student/assignments/${id}/result`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment && !error) {
    return <Layout title="Loading..."><div className="loading">Loading assignment...</div></Layout>;
  }

  if (error && !assignment) {
    return (
      <Layout title="Error">
        <div className="alert alert-error">{error}</div>
        <Link to="/student" className="btn btn-outline">Back to Dashboard</Link>
      </Layout>
    );
  }

  return (
    <Layout title={assignment.title}>
      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        {assignment.description && <p className="muted">{assignment.description}</p>}

        <form onSubmit={handleSubmit}>
          {assignment.questions.map((q, index) => (
            <div key={q.id} className="question-block">
              <h3>{index + 1}. {q.question_text}</h3>
              <div className="mcq-options">
                {[
                  { key: 'A', text: q.option_a },
                  { key: 'B', text: q.option_b },
                  { key: 'C', text: q.option_c },
                  { key: 'D', text: q.option_d },
                ].map((opt) => (
                  <label key={opt.key} className={`mcq-option ${answers[q.id] === opt.key ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={opt.key}
                      checked={answers[q.id] === opt.key}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt.key })}
                    />
                    <span className="option-label">{opt.key}.</span>
                    <span>{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="form-actions">
            <Link to="/student" className="btn btn-outline">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          </div>
        </form>
      </section>
    </Layout>
  );
}
