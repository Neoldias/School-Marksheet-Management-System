import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api';

function App() {
  // Navigation states: 
  // 'classes' (Home: list of classes)
  // 'class-detail' (List of students in selected class)
  // 'student-detail' (Student marksheet / batch edit form)
  const [currentView, setCurrentView] = useState('classes');

  // Data states
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [marksheet, setMarksheet] = useState(null);

  // Form toggles and states
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', phone: '' });
  const [batchMarks, setBatchMarks] = useState({}); // { [subject_id]: marks_value }
  const [isEditingMarks, setIsEditingMarks] = useState(false);

  // Alert and Loading states
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Fetch unique classes
  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_URL}/classes`);
      const data = await res.json();
      if (res.ok) {
        setClasses(data);
      }
    } catch (err) {
      triggerAlert('error', 'Cannot connect to backend server');
    }
  };

  // Fetch students in a class
  const fetchClassStudents = async (className) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/classes/${encodeURIComponent(className)}/students`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data);
      } else {
        triggerAlert('error', data.error || 'Failed to fetch students');
      }
    } catch (err) {
      triggerAlert('error', 'Error loading students');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_URL}/subjects`);
      const data = await res.json();
      if (res.ok) {
        setSubjects(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch student marksheet report
  const fetchStudentMarksheet = async (studentId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/marksheet/${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setMarksheet(data);
        // Pre-populate batch marks state
        const initialMarks = {};
        // Set existing marks
        data.marks.forEach(item => {
          initialMarks[item.subject_id] = item.marks.toString();
        });
        // Ensure any subjects without marks are empty/fillable
        subjects.forEach(sub => {
          if (!initialMarks[sub.subject_id]) {
            initialMarks[sub.subject_id] = '';
          }
        });
        setBatchMarks(initialMarks);
      } else {
        triggerAlert('error', data.error || 'Failed to fetch marksheet');
      }
    } catch (err) {
      triggerAlert('error', 'Error loading student details');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  // Action Handlers
  const handleSelectClass = (className) => {
    setSelectedClass(className);
    fetchClassStudents(className);
    setCurrentView('class-detail');
    setShowAddStudentForm(false);
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    fetchStudentMarksheet(student.student_id);
    setCurrentView('student-detail');
    setIsEditingMarks(false);
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!studentForm.name) {
      triggerAlert('error', 'Name is required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentForm.name,
          class: selectedClass,
          phone: studentForm.phone
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerAlert('success', 'Student added successfully!');
        setStudentForm({ name: '', phone: '' });
        setShowAddStudentForm(false);
        fetchClassStudents(selectedClass);
        // Refresh global classes list in case class structure changed (though it shouldn't for this view)
        fetchClasses();
      } else {
        triggerAlert('error', data.error || 'Failed to add student');
      }
    } catch (err) {
      triggerAlert('error', 'Error saving student');
    }
  };

  // Save all subject marks (batch)
  const handleBatchMarksSubmit = async (e) => {
    e.preventDefault();

    // Validate that ALL subjects have values
    const entries = [];
    for (const sub of subjects) {
      const val = batchMarks[sub.subject_id];
      if (val === undefined || val === '') {
        triggerAlert('error', `Please fill out marks for ${sub.subject_name}`);
        return;
      }
      entries.push({
        subject_id: sub.subject_id,
        marks: parseInt(val)
      });
    }

    try {
      const res = await fetch(`${API_URL}/marks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.student_id,
          marks: entries
        })
      });
      if (res.ok) {
        triggerAlert('success', 'Marks saved successfully!');
        setIsEditingMarks(false);
        fetchStudentMarksheet(selectedStudent.student_id);
      } else {
        const data = await res.json();
        triggerAlert('error', data.error || 'Failed to save marks');
      }
    } catch (err) {
      triggerAlert('error', 'Error saving marks');
    }
  };

  // Navigating back
  const handleBackToClasses = () => {
    fetchClasses(); // refresh class list
    setCurrentView('classes');
    setSelectedClass('');
    setStudents([]);
    setSelectedStudent(null);
    setMarksheet(null);
  };

  const handleBackToStudents = () => {
    fetchClassStudents(selectedClass);
    setCurrentView('class-detail');
    setSelectedStudent(null);
    setMarksheet(null);
  };

  // Fallback if no classes exist in the system yet
  const [customClassInput, setCustomClassInput] = useState('');
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);

  const handleCreateNewClassStudent = async (e) => {
    e.preventDefault();
    if (!customClassInput || !studentForm.name) {
      triggerAlert('error', 'Class name and Student name are required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentForm.name,
          class: customClassInput,
          phone: studentForm.phone
        })
      });
      if (res.ok) {
        triggerAlert('success', 'Student and Class created successfully!');
        setSelectedClass(customClassInput);
        setStudentForm({ name: '', phone: '' });
        setCustomClassInput('');
        setShowCreateClassForm(false);
        fetchClassStudents(customClassInput);
        setCurrentView('class-detail');
        fetchClasses();
      } else {
        const data = await res.json();
        triggerAlert('error', data.error || 'Failed to create');
      }
    } catch (err) {
      triggerAlert('error', 'Error occurred');
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1 onClick={handleBackToClasses} style={{ cursor: 'pointer' }}>
          <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          School Marksheet System
        </h1>

        {/* Breadcrumb / Top Info */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <span onClick={handleBackToClasses} style={{ cursor: 'pointer', hover: { color: 'white' } }}>Home</span>
          {selectedClass && (
            <>
              <span>/</span>
              <span onClick={handleBackToStudents} style={{ cursor: 'pointer' }}>{selectedClass}</span>
            </>
          )}
          {selectedStudent && (
            <>
              <span>/</span>
              <span style={{ color: 'var(--text-primary)' }}>{selectedStudent.name}</span>
            </>
          )}
        </div>
      </header>

      <main>
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {alert.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            {alert.message}
          </div>
        )}

        {/* VIEW 1: List of Classes (Home Page) */}
        {currentView === 'classes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Classes</h2>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowCreateClassForm(!showCreateClassForm)}>
                {showCreateClassForm ? 'Close Form' : 'Register Class & Student'}
              </button>
            </div>

            {showCreateClassForm && (
              <div className="glass-panel card" style={{ maxWidth: '500px', marginBottom: '2rem' }}>
                <h3>Register Class</h3>
                <form onSubmit={handleCreateNewClassStudent} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label>Class Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Class 10, Grade 12"
                      value={customClassInput}
                      onChange={(e) => setCustomClassInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>First Student Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Student Name"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Phone"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Create Class & Student</button>
                </form>
              </div>
            )}

            {classes.length > 0 ? (
              <div className="class-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {classes.map((cls, idx) => (
                  <div
                    key={idx}
                    className="glass-panel card class-card"
                    style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.3s' }}
                    onClick={() => handleSelectClass(cls)}
                  >
                    <h3 style={{ fontSize: '1.3rem', color: '#a5b4fc', marginBottom: '0.5rem' }}>{cls}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click to view students</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state glass-panel">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>No classes registered yet. Create a class and register your first student above!</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: List of Students inside a class */}
        {currentView === 'class-detail' && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={handleBackToClasses}>
                &larr; Back to Classes
              </button>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Class: {selectedClass}</h2>
            </div>

            <div className="dashboard-grid">
              {/* Student List */}
              <div className="glass-panel card">
                <h3>Students in {selectedClass}</h3>
                <div className="student-list" style={{ marginTop: '1rem', maxHeight: '600px' }}>
                  {students.map((student) => (
                    <div
                      key={student.student_id}
                      className="student-item"
                      onClick={() => handleSelectStudent(student)}
                    >
                      <div className="student-info">
                        <h3>{student.name}</h3>
                        <p>Phone: {student.phone || 'N/A'}</p>
                      </div>
                      <span className="badge">ID: #{student.student_id}</span>
                    </div>
                  ))}
                  {students.length === 0 && <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No students registered in this class.</p>}
                </div>
              </div>

              {/* Add Student panel */}
              <div className="glass-panel card">
                <h3>Register Student</h3>
                <form onSubmit={handleAddStudentSubmit} style={{ marginTop: '1.25rem' }}>
                  <div className="form-group">
                    <label>Student Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Neo"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 9123456780"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Add Student</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Student Details & Marks */}
        {currentView === 'student-detail' && selectedStudent && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={handleBackToStudents}>
                &larr; Back to Class Students
              </button>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Student Profile: {selectedStudent.name}</h2>
            </div>

            {loading ? (
              <div className="empty-state"><p>Loading student report...</p></div>
            ) : (
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Condition 1: Showing Marksheet if it has marks AND not in editing mode */}
                {marksheet && marksheet.marks.length > 0 && !isEditingMarks ? (
                  <div className="glass-panel card">
                    <div className="marksheet-header">
                      <div>
                        <div className="marksheet-title">{selectedStudent.name}</div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Class: {selectedClass} | Student ID: #{selectedStudent.student_id}</div>
                      </div>
                      <div className="marksheet-grade-container">
                        <div className="marksheet-grade-label">Grade</div>
                        <div className="marksheet-grade-badge">{marksheet.grade}</div>
                      </div>
                    </div>

                    <table>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Max Marks</th>
                          <th>Obtained Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marksheet.marks.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.subject_name}</td>
                            <td>{row.max_marks}</td>
                            <td style={{ fontWeight: '600', color: row.marks < 40 ? 'var(--accent)' : 'var(--success)' }}>{row.marks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="marksheet-summary" style={{ marginBottom: '1.5rem' }}>
                      <div>Total Score: {marksheet.total_obtained} / {marksheet.total_max}</div>
                      <div className="marksheet-percentage">Percentage: {marksheet.percentage}%</div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-secondary" onClick={() => setIsEditingMarks(true)}>
                        Edit Marks
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Condition 2: Empty marks (or editing) -> display ALL subjects fillable form (none can be empty) */
                  <div className="glass-panel card">
                    <h3>{isEditingMarks ? "Edit Subject Marks" : "No Marks Found - Enter Marks for All Subjects"}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 1.5rem 0' }}>
                      Please provide score values for all available subjects. None of the fields should be empty.
                    </p>

                    <form onSubmit={handleBatchMarksSubmit}>
                      {subjects.map((sub) => (
                        <div key={sub.subject_id} className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                          <div>
                            <span style={{ fontWeight: '500', fontSize: '1.05rem' }}>{sub.subject_name}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>(Max: {sub.max_marks})</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={sub.max_marks}
                            className="form-control"
                            placeholder="Enter marks"
                            value={batchMarks[sub.subject_id] || ''}
                            onChange={(e) => setBatchMarks({
                              ...batchMarks,
                              [sub.subject_id]: e.target.value
                            })}
                            required
                          />
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        {marksheet && marksheet.marks.length > 0 && (
                          <button type="button" className="btn btn-secondary" onClick={() => setIsEditingMarks(false)}>
                            Cancel
                          </button>
                        )}
                        <button type="submit" className="btn btn-primary">
                          Save All Marks
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
