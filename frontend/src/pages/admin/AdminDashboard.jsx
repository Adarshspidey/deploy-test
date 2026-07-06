import { useEffect, useState } from 'react';
import api from '../../api/client';
import Layout from '../../components/Layout';

const emptyUser = { email: '', full_name: '', password: '' };

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherForm, setTeacherForm] = useState(emptyUser);
  const [studentForm, setStudentForm] = useState(emptyUser);
  const [assignTeacherId, setAssignTeacherId] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('teachers');

  const loadData = async () => {
    const [teachersRes, studentsRes] = await Promise.all([
      api.get('/admin/teachers'),
      api.get('/admin/students'),
    ]);
    setTeachers(teachersRes.data);
    setStudents(studentsRes.data);
  };

  useEffect(() => {
    loadData().catch(() => setError('Failed to load data'));
  }, []);

  const showMessage = (msg) => {
    setMessage(msg);
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const createTeacher = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/teachers', teacherForm);
      setTeacherForm(emptyUser);
      showMessage('Teacher created successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create teacher');
    }
  };

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/students', studentForm);
      setStudentForm(emptyUser);
      showMessage('Student created successfully');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create student');
    }
  };

  const assignStudent = async (studentId) => {
    const teacherId = assignTeacherId[studentId];
    if (!teacherId) return;
    try {
      await api.put(`/admin/students/${studentId}/assign`, { teacher_id: Number(teacherId) });
      showMessage('Student assigned to teacher');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign student');
    }
  };

  return (
    <Layout title="Super Admin Dashboard">
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button type="button" className={activeTab === 'teachers' ? 'tab active' : 'tab'} onClick={() => setActiveTab('teachers')}>
          Teachers ({teachers.length})
        </button>
        <button type="button" className={activeTab === 'students' ? 'tab active' : 'tab'} onClick={() => setActiveTab('students')}>
          Students ({students.length})
        </button>
      </div>

      {activeTab === 'teachers' && (
        <div className="grid-2">
          <section className="card">
            <h2>Create Teacher</h2>
            <form onSubmit={createTeacher}>
              <div className="form-group">
                <label>Full Name</label>
                <input value={teacherForm.full_name} onChange={(e) => setTeacherForm({ ...teacherForm, full_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary">Create Teacher</button>
            </form>
          </section>

          <section className="card">
            <h2>All Teachers</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id}>
                      <td>{t.full_name}</td>
                      <td>{t.email}</td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr><td colSpan={2} className="empty">No teachers yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="grid-2">
          <section className="card">
            <h2>Create Student</h2>
            <form onSubmit={createStudent}>
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
              <button type="submit" className="btn btn-primary">Create Student</button>
            </form>
          </section>

          <section className="card">
            <h2>All Students</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Teacher</th>
                    <th>Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.full_name}</td>
                      <td>{s.email}</td>
                      <td>{s.teacher_name || <span className="muted">Unassigned</span>}</td>
                      <td>
                        <div className="assign-row">
                          <select
                            value={assignTeacherId[s.id] || s.teacher_id || ''}
                            onChange={(e) => setAssignTeacherId({ ...assignTeacherId, [s.id]: e.target.value })}
                          >
                            <option value="">Select teacher</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                          </select>
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => assignStudent(s.id)}>
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={4} className="empty">No students yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
