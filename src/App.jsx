import { useEffect, useMemo, useState } from 'react'
import { auth, googleProvider } from './firebaseConfig'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import './App.css'

const storageKey = (uid) => `todo-reminder-${uid}`

function formatDate(dateString) {
  if (!dateString) return 'No due date'
  return new Date(dateString).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// return local string like 'YYYY-MM-DDTHH:MM' for datetime-local inputs
function localDateTimeInputValue(date = new Date()) {
  const tzOffset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - tzOffset * 60000)
  return local.toISOString().slice(0, 16)
}


function App() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        const saved = localStorage.getItem(storageKey(currentUser.uid))
        if (saved) {
          try {
            setTasks(JSON.parse(saved))
          } catch {
            setTasks([])
          }
        }
      } else {
        setTasks([])
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) return
    localStorage.setItem(storageKey(user.uid), JSON.stringify(tasks))
  }, [tasks, user])

  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  )

  const handleLogin = async () => {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (authError) {
      console.error('Google sign-in error:', authError)
      setError(authError?.message || 'Google sign-in failed. Please try again.')
    }
  }

  const handleEmailSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter both email and password to continue.')
      return
    }

    if (isRegister && !username.trim()) {
      setError('Enter a username to create an account.')
      return
    }

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(userCredential.user, { displayName: username.trim() })
        setUsername('')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (authError) {
      console.error('Email auth error:', authError)
      setError(authError?.message || 'Authentication failed. Please try again.')
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    setTitle('')
    setDueAt('')
    setTasks([])
  }

  const addTask = (event) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Enter a reminder title before saving.')
      return
    }
    if (dueAt) {
      try {
        if (new Date(dueAt) < new Date()) {
          setError('Due date cannot be in the past.')
          return
        }
      } catch {}
    }

    const nextTask = {
      id: crypto.randomUUID(),
      text: title.trim(),
      dueAt: dueAt || null,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    setTasks((current) => [nextTask, ...current])
    setTitle('')
    setDueAt('')
    setError('')
  }

  const toggleTask = (id) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    )
  }

  const deleteTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  const userName = user?.displayName?.split(' ')[0] || 'Guest'
  const upcomingTasks = tasks.filter((task) => !task.completed)
  const now = new Date()
  const isDatePast = (d) => {
    if (!d) return false
    return new Date(d) < now
  }
  const isDateSoon = (d) => {
    if (!d) return false
    const diff = new Date(d) - now
    return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 2 // within 48 hours
  }

  const canSave = title.trim() !== '' && (!dueAt || new Date(dueAt) >= new Date())

  

  return (
    <div className="app-shell">
      <nav className="top-navbar">
        <div className="navbar-brand">TodoReminder</div>
        <div className="navbar-center">
          <a className="navbar-link">Reminders</a>
          <a className="navbar-link">Calendar</a>
          <a className="navbar-link">Settings</a>
        </div>
        <div className="navbar-right">
          {user ? (
            <>
              <span className="navbar-user">{userName}</span>
              <button className="button-ghost" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <button className="button-ghost" onClick={() => setIsRegister(false)}>Sign in</button>
          )}
        </div>
      </nav>

      {!user ? (
        <main className="auth-container">
          <div className="auth-card">
            <div className="auth-card-header">
              <p className="eyebrow">{isRegister ? 'Create account' : 'Sign in'}</p>
              <h2>{isRegister ? 'Join and start organizing' : 'Welcome back'}</h2>
            </div>
            <form className="auth-form" onSubmit={handleEmailSubmit}>
              {isRegister && (
                <label>
                  Username
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Choose a username"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
              </label>
              <button className="button-primary" type="submit">
                {isRegister ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <p className="auth-alt">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button" 
                className="button-link" 
                onClick={() => {
                  setIsRegister((current) => !current)
                  setEmail('')
                  setPassword('')
                  setUsername('')
                  setError('')
                }}
              >
                {isRegister ? 'Sign in' : 'Create one'}
              </button>
            </p>
            <div className="divider">OR</div>
            <button className="button-google" onClick={handleLogin} type="button">
              <span className="google-logo" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44.5 20H24v8.5h11.8C34.1 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.1-6.1C34.7 6 29.8 4 24 4 12.5 4 4 12.5 4 24s8.5 20 20 20c11.5 0 20-8.5 20-20 0-1.3-.1-2.5-.5-3.7Z" fill="#FFC107"/>
                  <path d="M6.3 14.7 14.6 20c1.6-4.7 5.9-8 10.4-8 2.8 0 5.3 1.1 7.3 2.9l5.4-5.4C31.1 7 27 5 22.9 5 15 5 8.2 9.4 6.3 14.7Z" fill="#FF3D00"/>
                  <path d="M24 44c5.1 0 9.6-1.7 13.2-4.7l-6.1-5.1C29.5 34.7 26.9 35.9 24 35.9c-5.2 0-9.6-3.2-11.3-7.7l-6.3 4.9C9.9 39.9 16.4 44 24 44Z" fill="#4CAF50"/>
                  <path d="M44.5 20H24v8.5h11.8c-1.1 3.2-3.8 5.8-7.1 6.8v5.6c6.6-1.2 11.8-6.9 11.8-12.9 0-.9-.1-1.8-.2-2.5Z" fill="#1976D2"/>
                </svg>
              </span>
              {isRegister ? 'Sign up with Google' : 'Continue with Google'}
            </button>
            {error && <p className="form-error">{error}</p>}
          </div>
        </main>
      ) : (
        <main className="dashboard-panel">
          <section className="task-form-card">
            <div className="form-header">
              <svg className="form-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9H13V8.5h-2V11H8.5v2H11v2.5h2V13h2.5v-2z" fill="currentColor"/>
              </svg>
              <h3>Add a new reminder</h3>
            </div>
            <form className="task-form" onSubmit={addTask}>
              <div className="form-group">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs to be done?"
                  className="form-input-title"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" fill="currentColor"/>
                    </svg>
                    Due date & time
                  </label>
                  <input
                    type="datetime-local"
                    min={localDateTimeInputValue()}
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    className="form-input-datetime"
                  />
                </div>
              </div>
              {error && <p className="form-error-msg">{error}</p>}
              <div className="form-actions">
                <button className="button-primary" type="submit" disabled={!canSave}>
                  Add reminder
                </button>
              </div>
            </form>
          </section>

          <section className="task-list-card">
            <div className="list-header">
              <h3>Your reminders</h3>
              <span className="list-count">{tasks.length} item{tasks.length !== 1 ? 's' : ''}</span>
            </div>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.4">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
                <p>No reminders yet. Create one to get started!</p>
              </div>
            ) : (
              <ul className="task-list">
                {tasks.map((task) => {
                  const overdue = !task.completed && isDatePast(task.dueAt)
                  const soon = !task.completed && isDateSoon(task.dueAt)
                  return (
                    <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''} ${soon ? 'soon' : ''}`}>
                      <button 
                        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                        onClick={() => toggleTask(task.id)}
                        aria-label="Toggle task"
                      >
                        {task.completed && <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>}
                      </button>
                      <div className="task-content">
                        <p className="task-title">{task.text}</p>
                        {task.dueAt && (
                          <p className={`task-due ${overdue ? 'overdue-text' : soon ? 'soon-text' : ''}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            {formatDate(task.dueAt)}
                          </p>
                        )}
                      </div>
                      <button 
                        className="task-delete-btn"
                        onClick={() => deleteTask(task.id)}
                        aria-label="Delete task"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </main>
      )}
    </div>
  )
}

export default App
