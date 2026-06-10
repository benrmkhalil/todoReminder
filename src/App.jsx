import { useEffect, useMemo, useState } from 'react'
import { auth, googleProvider } from './firebaseConfig'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
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
          <p className="eyebrow">Reminder Hub</p>
          <h1>Personal reminders that feel like a real productivity app.</h1>
          <p className="hero-text">
            Save tasks, schedule follow-ups, and keep everything in one polished
            dashboard. Sign in with Google to keep your reminders linked to your
            account and available in your browser.
          </p>
          {!user ? (
            <button className="button-primary" onClick={handleLogin}>
              Sign in with Google
            </button>
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
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="hero-card">
          <div className="hero-status">
            <span>Overview</span>
            <strong>{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
          </div>
          <div className="hero-stats">
            <div>
              <span>All reminders</span>
              <strong>{tasks.length}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>
          <div className="hero-notice">
            <p>Use the form below to add a reminder, then mark it complete when it's done.</p>
          </div>
        </div>
      </header>

      {user && (
        <main className="dashboard-panel">
          <section className="task-form-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">New reminder</p>
                <h2>Create quick task</h2>
              </div>
              <span className="pill">Instant save</span>
            </div>
            <form className="task-form" onSubmit={addTask}>
              <label>
                What do you need to remember?
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter a reminder title"
                />
              </label>
              <label>
                Due date
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
                <p className="eyebrow">Your reminders</p>
                <h2>Today’s list</h2>
              </div>
              <span className="pill secondary">{tasks.length} items</span>
            </div>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <p>No reminders yet. Add one to get started and stay on top of your day.</p>
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
