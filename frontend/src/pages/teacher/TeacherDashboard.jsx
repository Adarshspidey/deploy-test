import { useEffect, useState } from 'react';
import api from '../../api/client';
import Layout from '../../components/Layout';

const emptyStudent = { email: '', full_name: '', password: '' };
const emptyQuestion = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
};

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    questions: [{ ...emptyQuestion }],
  });
  const [submissions, setSubmissions] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('students');

  const loadData = async () => {
    const [studentsRes, assignmentsRes] = await Promise.all([
      api.get('/teacher/students'),
      api.get('/teacher/assignments'),
    ]);
    setStudents(studentsRes.data);
    setAssignments(assignmentsRes.data);
  };

  useEffect(() => {
    loadData().catch(() => setError('Failed to load data'));
  }, []);

  const showMessage = (msg) => {
    setMessage(msg);
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const addStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teacher/students', studentForm);
      setStudentForm(emptyStudent);
      showMessage('Student added successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add student');
    }
  };

  const addQuestion = () => {
    setAssignmentForm({
      ...assignmentForm,
      questions: [...assignmentForm.questions, { ...emptyQuestion }],
    });
  };

  const updateQuestion = (index, field, value) => {
    const questions = [...assignmentForm.questions];
    questions[index] = { ...questions[index], [field]: value };
    setAssignmentForm({ ...assignmentForm, questions });
  };

  const removeQuestion = (index) => {
    if (assignmentForm.questions.length <= 1) return;
    setAssignmentForm({
      ...assignmentForm,
      questions: assignmentForm.questions.filter((_, i) => i !== index),
    });
  };

  const createAssignment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teacher/assignments', assignmentForm);
      setAssignmentForm({ title: '', description: '', questions: [{ ...emptyQuestion }] });
      showMessage('Assignment created and sent to all your students');
      loadData();
      setActiveTab('assignments');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create assignment');
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const { data } = await api.get(`/teacher/assignments/${assignmentId}/submissions`);
      setSubmissions({ ...submissions, [assignmentId]: data });
    } catch {
      setError('Failed to load submissions');
    }
  };

  return (
    <Layout title="Teacher Dashboard">
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button type="button" className={activeTab === 'students' ? 'tab active' : 'tab'} onClick={() => setActiveTab('students')}>
          My Students ({students.length})
        </button>
        <button type="button" className={activeTab === 'create' ? 'tab active' : 'tab'} onClick={() => setActiveTab('create')}>
          Create Assignment
        </button>
        <button type="button" className={activeTab === 'assignments' ? 'tab active' : 'tab'} onClick={() => setActiveTab('assignments')}>
          Assignments ({assignments.length})
        </button>
      </div>

      {activeTab === 'students' && (
        <div className="grid-2">
          <section className="card">
            <h2>Add Student</h2>
            <form onSubmit={addStudent}>
              <div className="form-group">
                <label>Full Name</label>
                <input value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary">Add Student</button>
            </form>
          </section>

          <section className="card">
            <h2>My Students</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.full_name}</td>
                      <td>{s.email}</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={2} className="empty">No students assigned yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'create' && (
        <section className="card">
          <h2>Create Multiple Choice Assignment</h2>
          <p className="muted">This assignment will be available to all students under you.</p>
          <form onSubmit={createAssignment}>
            <div className="form-group">
              <label>Title</label>
              <input value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} rows={2} />
            </div>

            <h3>Questions</h3>
            {assignmentForm.questions.map((q, index) => (
              <div key={index} className="question-block">
                <div className="question-header">
                  <strong>Question {index + 1}</strong>
                  {assignmentForm.questions.length > 1 && (
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeQuestion(index)}>Remove</button>
                  )}
                </div>
                <div className="form-group">
                  <label>Question Text</label>
                  <input value={q.question_text} onChange={(e) => updateQuestion(index, 'question_text', e.target.value)} required />
                </div>
                <div className="options-grid">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <div key={opt} className="form-group">
                      <label>Option {opt}</label>
                      <input
                        value={q[`option_${opt.toLowerCase()}`]}
                        onChange={(e) => updateQuestion(index, `option_${opt.toLowerCase()}`, e.target.value)}
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="form-group">
                  <label>Correct Answer</label>
                  <select value={q.correct_option} onChange={(e) => updateQuestion(index, 'correct_option', e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ))}

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={addQuestion}>+ Add Question</button>
              <button type="submit" className="btn btn-primary">Publish Assignment</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'assignments' && (
        <section className="card">
          <h2>My Assignments</h2>
          {assignments.length === 0 ? (
            <p className="empty">No assignments created yet</p>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="assignment-item">
                <div className="assignment-header">
                  <div>
                    <h3>{a.title}</h3>
                    {a.description && <p className="muted">{a.description}</p>}
                    <span className="badge">{a.questions.length} questions</span>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={() => loadSubmissions(a.id)}>
                    View Submissions
                  </button>
                </div>
                {submissions[a.id] && (
                  <div className="submissions-list">
                    {submissions[a.id].length === 0 ? (
                      <p className="muted">No submissions yet</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Score</th>
                            <th>Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions[a.id].map((s) => (
                            <tr key={s.id}>
                              <td>{s.student_name}</td>
                              <td>{s.score}/{s.total_questions} ({s.percentage}%)</td>
                              <td>{new Date(s.submitted_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}
    </Layout>
  );
}
