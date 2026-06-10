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

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Task Management</p>
          <h1>Never miss what matters. Organize your priorities.</h1>
          <p className="hero-text">
            A clean, distraction-free space to capture reminders, deadlines, and follow-ups. 
            Stay on top of your goals with simple task tracking.
          </p>
          {!user ? (
            <div className="auth-card">
              <div className="auth-card-header">
                <p className="eyebrow">Get started</p>
                <h2>{isRegister ? 'Create your account' : 'Sign in to continue'}</h2>
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
                Continue with Google
              </button>
              {error && <p className="form-error">{error}</p>}
            </div>
          ) : (
            <div className="profile-strip">
              <div>
                <p className="small-label">Signed in as</p>
                <h2>{userName}</h2>
                <p>{upcomingTasks.length} active reminder(s)</p>
              </div>
              <button className="button-ghost" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {user && (
        <main className="dashboard-panel">
          <section className="task-form-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Add task</p>
                <h2>Capture your next action</h2>
              </div>
              <span className="pill">Quick save</span>
            </div>
            <form className="task-form" onSubmit={addTask}>
              <label>
                What's your next action?
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Add a task or reminder"
                />
              </label>
              <label>
                Due date or time
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </label>
              <button className="button-primary" type="submit">
                Save reminder
              </button>
            </form>
          </section>

          <section className="task-list-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">All tasks</p>
                <h2>Your progress</h2>
              </div>
              <span className="pill secondary">{tasks.length} items</span>
            </div>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>No tasks yet. Add your first task to get organized.</p>
              </div>
            ) : (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id} className={task.completed ? 'task-item completed' : 'task-item'}>
                    <div className="task-main">
                      <button className="task-toggle" onClick={() => toggleTask(task.id)}>
                        {task.completed ? '✓' : ''}
                      </button>
                      <div>
                        <p className="task-title">{task.text}</p>
                        <p className="task-meta">{formatDate(task.dueAt)}</p>
                      </div>
                    </div>
                    <button className="task-delete" onClick={() => deleteTask(task.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      )}
    </div>
  )
}

export default App
