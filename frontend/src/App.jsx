import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000/api`
const roleFilterOptions = ['All', 'Admin', 'Manager', 'Member']
const statuses = ['Backlog', 'In Progress', 'Blocked', 'Done']
const leaderRoles = ['Admin', 'Manager']
const todayValue = () => new Date().toISOString().slice(0, 10)
const monthValue = () => new Date().toISOString().slice(0, 7)
const taskPoints = {
  Backlog: 0,
  'In Progress': 4,
  Blocked: 1,
  Done: 10,
}

const initialTaskForm = {
  task: '',
  owner: '',
  status: 'In Progress',
  blocker: '',
  start_time: '',
  end_time: '',
}

const initialAuthForm = {
  username: '',
  password: '',
  display_name: '',
}

const initialChatForm = {
  content: '',
  audience: 'All',
}

const initialStandupForm = {
  yesterday: '',
  today: '',
  blocker: '',
}

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? match[2] : ''
}

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
      ...options.headers,
    },
    ...options,
  })

  return {
    response,
    data: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null,
  }
}

const statusClass = (status) => status.toLowerCase().replace(/\s+/g, '-')
function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [authMessage, setAuthMessage] = useState('')
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState({ completed: 0, pending_blockers: 0, in_progress: 0 })
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [taskForm, setTaskForm] = useState(initialTaskForm)
  const [chatForm, setChatForm] = useState(initialChatForm)
  const [standupForm, setStandupForm] = useState(initialStandupForm)
  const [filterRole, setFilterRole] = useState('All')
  const [taskScope, setTaskScope] = useState('team')
  const [selectedDate, setSelectedDate] = useState(todayValue)
  const [selectedMonth, setSelectedMonth] = useState(monthValue)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const chatEndRef = useRef(null)

  const loadTasks = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/tasks/?date=${date}`)
    if (response.ok) setTasks(data)
  }

  const loadSummary = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/tasks/summary/?date=${date}`)
    if (response.ok) setSummary(data)
  }

  const loadMessages = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/messages/?date=${date}`)
    if (response.ok) setMessages(data)
  }

  const loadMembers = async () => {
    const { response, data } = await fetchJson(`${API_BASE}/members/`)
    if (response.ok) setMembers(data)
  }

  const loadMonthlyReport = async (month = selectedMonth) => {
    const { response, data } = await fetchJson(`${API_BASE}/tasks/monthly-report/?month=${month}`)
    if (response.ok) setMonthlyReport(data)
  }

  const refreshData = async (includeMessages = Boolean(user), date = selectedDate) => {
    const loaders = [loadTasks(date), loadSummary(date), loadMonthlyReport()]
    if (includeMessages) loaders.push(loadMessages(date), loadMembers())
    await Promise.all(loaders)
  }

  useEffect(() => {
    const bootstrap = async () => {
      const { response, data } = await fetchJson(`${API_BASE}/auth/session/`)

      if (response.ok && data.authenticated) {
        setUser(data)
        setTaskForm((current) => ({ ...current, owner: data.display_name }))
        setTaskScope(leaderRoles.includes(data.role) ? 'team' : 'mine')
        const [tasksResult, summaryResult, messagesResult, membersResult, reportResult] = await Promise.all([
          fetchJson(`${API_BASE}/tasks/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/tasks/summary/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/messages/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/members/`),
          fetchJson(`${API_BASE}/tasks/monthly-report/?month=${selectedMonth}`),
        ])
        if (tasksResult.response.ok) setTasks(tasksResult.data)
        if (summaryResult.response.ok) setSummary(summaryResult.data)
        if (messagesResult.response.ok) setMessages(messagesResult.data)
        if (membersResult.response.ok) setMembers(membersResult.data)
        if (reportResult.response.ok) setMonthlyReport(reportResult.data)
      } else {
        setUser(null)
        setTasks([])
        setMessages([])
        setMembers([])
      }
    }

    bootstrap()
  }, [selectedDate, selectedMonth])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, filterRole])

  const isLeader = leaderRoles.includes(user?.role)
  const displayName = user?.display_name || user?.username || 'Team'
  const myTasks = useMemo(() => {
    const names = [displayName, user?.username].filter(Boolean).map((name) => name.toLowerCase())
    return tasks.filter((task) => names.includes(task.owner.toLowerCase()))
  }, [displayName, tasks, user?.username])
  const visibleTasks = taskScope === 'mine' ? myTasks : tasks
  const visibleBlockedTasks = useMemo(() => visibleTasks.filter((task) => task.blocked), [visibleTasks])

  const visibleMessages = useMemo(() => {
    return messages.filter((message) => {
      if (filterRole === 'All') return true
      return message.audience === 'All' || message.audience === filterRole || message.sender_role === filterRole
    })
  }, [messages, filterRole])

  const tasksByStatus = useMemo(() => {
    return statuses.reduce((grouped, status) => {
      grouped[status] = visibleTasks.filter((task) => task.status === status)
      return grouped
    }, {})
  }, [visibleTasks])

  const dailyProgress = useMemo(() => {
    const selectedDay = new Date(`${selectedDate}T00:00:00`)
    const isSunday = selectedDay.getDay() === 0
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'Done').length
    const active = tasks.filter((task) => task.status === 'In Progress').length
    const blocked = tasks.filter((task) => task.status === 'Blocked').length
    const percent = total ? Math.round((done / total) * 100) : 0
    const memberMap = tasks.reduce((grouped, task) => {
      const owner = task.owner || 'Unassigned'
      if (!grouped[owner]) {
        grouped[owner] = { owner, total: 0, done: 0, active: 0, blocked: 0, points: 0 }
      }

      grouped[owner].total += 1
      grouped[owner].points += taskPoints[task.status] || 0
      if (task.status === 'Done') grouped[owner].done += 1
      if (task.status === 'In Progress') grouped[owner].active += 1
      if (task.status === 'Blocked') grouped[owner].blocked += 1
      if (task.status === 'Done' && task.created_at && task.updated_at) {
        const created = new Date(task.created_at)
        const updated = new Date(task.updated_at)
        const hours = (updated - created) / (1000 * 60 * 60)
        if (hours <= 4) grouped[owner].points += 5
        else if (hours <= 8) grouped[owner].points += 3
      }
      return grouped
    }, {})

    const knownMembers = members.length
      ? members.map((member) => member.display_name || member.username)
      : Object.keys(memberMap)

    const memberRows = knownMembers.map((owner) => {
      const row = memberMap[owner] || { owner, total: 0, done: 0, active: 0, blocked: 0, points: 0 }
      const attendance = isSunday ? 'Holiday' : row.total > 0 ? 'Present' : 'Absent'
      return { ...row, owner, attendance }
    })

    const present = memberRows.filter((member) => member.attendance === 'Present').length
    const absent = memberRows.filter((member) => member.attendance === 'Absent').length
    const holiday = memberRows.filter((member) => member.attendance === 'Holiday').length

    return {
      total,
      done,
      active,
      blocked,
      percent,
      present,
      absent,
      holiday,
      isSunday,
      members: memberRows.sort((a, b) => b.points - a.points || b.total - a.total || a.owner.localeCompare(b.owner)),
    }
  }, [members, selectedDate, tasks])

  const today = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${selectedDate}T00:00:00`))
  const flowCopy = isLeader
    ? 'Assign work, spot blockers, and move the team forward.'
    : 'See your tasks, update progress, and flag blockers fast.'

  const handleTaskChange = (event) => {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  const handleDateChange = (event) => {
    const date = event.target.value
    setSelectedDate(date)
  }

  const handleMonthChange = async (event) => {
    const month = event.target.value
    setSelectedMonth(month)
    if (user) {
      await loadMonthlyReport(month)
    }
  }

  const handleAuthChange = (event) => {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  const handleChatChange = (event) => {
    const { name, value } = event.target
    setChatForm((current) => ({ ...current, [name]: value }))
  }

  const handleStandupChange = (event) => {
    const { name, value } = event.target
    setStandupForm((current) => ({ ...current, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setAuthMessage('')

    try {
      const endpoint = authMode === 'login' ? '/auth/login/' : '/auth/register/'
      const body = authMode === 'login'
        ? { username: authForm.username, password: authForm.password }
        : { username: authForm.username, password: authForm.password, display_name: authForm.display_name }

      const { response, data } = await fetchJson(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error(data?.detail || 'Authentication failed')

      setUser(data)
      setTaskScope(leaderRoles.includes(data.role) ? 'team' : 'mine')
      setTaskForm((current) => ({ ...current, owner: data.display_name }))
      setAuthForm(initialAuthForm)
      setAuthMessage('')
      await refreshData(true)
    } catch (error) {
      setAuthMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const { response } = await fetchJson(`${API_BASE}/auth/logout/`, { method: 'POST' })
    if (response.ok) {
      setUser(null)
      setTaskForm(initialTaskForm)
      setAuthMessage('Signed out')
    }
  }

  const handleTaskSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const payload = {
        ...taskForm,
        owner: taskForm.owner || displayName,
        work_date: selectedDate,
      }
      if (!payload.start_time) delete payload.start_time
      if (!payload.end_time) delete payload.end_time

      const { response } = await fetchJson(`${API_BASE}/tasks/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Unable to save task')

      setTaskForm({ ...initialTaskForm, owner: displayName })
      setStatusMessage('Task added')
      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId, status) => {
    setLoading(true)
    setStatusMessage('')

    try {
      const { response } = await fetchJson(`${API_BASE}/tasks/${taskId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Unable to update task')

      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!chatForm.content.trim()) return

    setLoading(true)
    try {
      const { response, data } = await fetchJson(`${API_BASE}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ ...chatForm, work_date: selectedDate }),
      })

      if (!response.ok) throw new Error('Could not send message')

      setChatForm(initialChatForm)
      setMessages((current) => [...current, data])
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const postTeamUpdate = async (content, audience = 'All') => {
    if (!content.trim()) return

    setLoading(true)
    setStatusMessage('')
    try {
      const { response, data } = await fetchJson(`${API_BASE}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ content, audience, work_date: selectedDate }),
      })

      if (!response.ok) throw new Error('Could not send update')

      setMessages((current) => [...current, data])
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submitStandup = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    const content = [
      'Daily standup',
      `Yesterday: ${standupForm.yesterday || 'No update'}`,
      `Today: ${standupForm.today || 'No update'}`,
      `Blocker: ${standupForm.blocker || 'None'}`,
    ].join('\n')

    try {
      const { response } = await fetchJson(`${API_BASE}/standups/`, {
        method: 'POST',
        body: JSON.stringify({ ...standupForm, work_date: selectedDate }),
      })

      if (!response.ok) throw new Error('Could not save standup')

      await postTeamUpdate(content)
      setStandupForm(initialStandupForm)
      setStatusMessage('Standup posted')
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="login-copy">
            <div className="brand-row">
              <div className="brand-mark">TB</div>
              <div>
                <strong>Team Board</strong>
                <span>Daily workspace</span>
              </div>
            </div>

            <p className="eyebrow">Fast team check-ins</p>
            <h1>Know what matters today.</h1>
            <p>Tasks, blockers, and short updates in one focused board your team can open every morning.</p>
          </div>

          <form className="auth-card" onSubmit={handleAuthSubmit}>
            <div className="auth-title">
              <h2>{authMode === 'login' ? 'Welcome back' : 'Create your space'}</h2>
              <p>{authMode === 'login' ? 'Open the board and start the day.' : 'Join your team board in seconds.'}</p>
            </div>

            <div className="auth-switcher" aria-label="Auth mode">
              <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                Login
              </button>
              <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
                Register
              </button>
            </div>

            <label>
              Username
              <input name="username" value={authForm.username} onChange={handleAuthChange} autoComplete="username" required />
            </label>

            <label>
              Password
              <input name="password" type="password" value={authForm.password} onChange={handleAuthChange} autoComplete="current-password" required />
            </label>

            {authMode === 'register' ? (
              <>
                <label>
                  Display name
                  <input name="display_name" value={authForm.display_name} onChange={handleAuthChange} placeholder="Your name" />
                </label>

                <p className="register-note">New accounts start as Members. Ask an admin to change access.</p>
              </>
            ) : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Please wait' : authMode === 'login' ? 'Open board' : 'Create account'}
            </button>

            {authMessage && <p className="form-message">{authMessage}</p>}
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Team Board</h1>
          <p>{flowCopy}</p>
        </div>
        <div className="user-menu">
          <label className="date-picker">
            Work date
            <input type="date" value={selectedDate} onChange={handleDateChange} />
          </label>
          <label className="date-picker">
            Report month
            <input type="month" value={selectedMonth} onChange={handleMonthChange} />
          </label>
          <span>{displayName}</span>
          <strong>{user.role}</strong>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section className="metrics-row" aria-label="Team summary">
        <article>
          <span>In progress</span>
          <strong>{taskScope === 'mine' ? tasksByStatus['In Progress']?.length || 0 : summary.in_progress}</strong>
        </article>
        <article>
          <span>Done</span>
          <strong>{taskScope === 'mine' ? tasksByStatus.Done?.length || 0 : summary.completed}</strong>
        </article>
        <article className={visibleBlockedTasks.length ? 'needs-attention' : ''}>
          <span>Blockers</span>
          <strong>{taskScope === 'mine' ? visibleBlockedTasks.length : summary.pending_blockers}</strong>
        </article>
        <article>
          <span>{taskScope === 'mine' ? 'My tasks' : 'Team tasks'}</span>
          <strong>{visibleTasks.length}</strong>
        </article>
      </section>

      <section className="flow-bar" aria-label="Work mode">
        <div>
          <strong>{isLeader ? 'Team control' : 'My daily work'}</strong>
          <span>{flowCopy}</span>
        </div>
        <div className="scope-toggle">
          {isLeader ? (
            <button type="button" className={taskScope === 'team' ? 'active' : ''} onClick={() => setTaskScope('team')}>
              Team
            </button>
          ) : null}
          <button type="button" className={taskScope === 'mine' ? 'active' : ''} onClick={() => setTaskScope('mine')}>
            My tasks
          </button>
        </div>
      </section>

      <section className={`collaboration-grid ${isLeader ? '' : 'single'}`}>
        <section className="standup-panel panel" aria-label="Daily standup">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">10 min standup</p>
              <h2>Share your daily update</h2>
            </div>
            <div className="standup-time">
              <span>10</span>
              <small>min</small>
            </div>
          </div>

          <form className="standup-form" onSubmit={submitStandup}>
            <label>
              Yesterday
              <textarea name="yesterday" value={standupForm.yesterday} onChange={handleStandupChange} placeholder="What did you finish?" rows="2" />
            </label>
            <label>
              Today
              <textarea name="today" value={standupForm.today} onChange={handleStandupChange} placeholder="What will you work on?" rows="2" />
            </label>
            <label>
              Blocker
              <textarea name="blocker" value={standupForm.blocker} onChange={handleStandupChange} placeholder="Anything stopping you?" rows="2" />
            </label>
            <button className="primary-button" type="submit" disabled={loading}>Post standup</button>
          </form>

          <div className="quick-collab" aria-label="Quick collaboration actions">
            <button type="button" onClick={() => postTeamUpdate(`${displayName} needs a quick review.`)} disabled={loading}>Need review</button>
            <button type="button" onClick={() => postTeamUpdate(`${displayName} is available to help.`)} disabled={loading}>Available</button>
            <button type="button" onClick={() => postTeamUpdate(`${displayName} has a blocker and needs support.`)} disabled={loading}>Need support</button>
          </div>
        </section>

        {isLeader ? (
          <section className="daily-progress panel" aria-label="Daily progress">
            <div className="daily-progress-main">
              <div>
                <p className="eyebrow">Daily progress</p>
                <h2>{dailyProgress.percent}% complete today</h2>
                <p>{dailyProgress.done} done, {dailyProgress.active} in progress, {dailyProgress.blocked} blocked</p>
                <div className="attendance-summary">
                  <span className="present">{dailyProgress.present} present</span>
                  <span className="absent">{dailyProgress.absent} absent</span>
                  <span className="holiday">{dailyProgress.holiday} holiday</span>
                </div>
              </div>
              <div className="progress-ring" style={{ '--progress': `${dailyProgress.percent}%` }}>
                <span>{dailyProgress.percent}%</span>
              </div>
            </div>

            <div className="progress-track large" aria-hidden="true">
              <div style={{ width: `${dailyProgress.percent}%` }}></div>
            </div>

            <div className="member-progress-list">
              {dailyProgress.members.length ? dailyProgress.members.map((member) => {
                const memberPercent = member.total ? Math.round((member.done / member.total) * 100) : 0
                return (
                  <article className="member-progress" key={member.owner}>
                    <div>
                      <strong>{member.owner}</strong>
                      <span>{member.done}/{member.total} done</span>
                    </div>
                    <div className="member-meta-row">
                      <span className={`attendance-pill ${member.attendance.toLowerCase()}`}>{member.attendance}</span>
                      <span className="points-pill">{member.points} pts</span>
                    </div>
                    <div className="mini-progress">
                      <span style={{ width: `${memberPercent}%` }}></span>
                    </div>
                    <small>{member.active} active · {member.blocked} blocked</small>
                  </article>
                )
              }) : <p className="empty-state">No task movement today yet.</p>}
            </div>
          </section>
        ) : null}
      </section>

      {monthlyReport ? (
        <section className="monthly-report panel" aria-label="Monthly report">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Monthly report</p>
              <h2>{isLeader ? 'Team month view' : 'My month view'}</h2>
            </div>
            <span className="count-pill">{monthlyReport.month}</span>
          </div>

          <div className="monthly-stats">
            <article><span>Total</span><strong>{monthlyReport.total}</strong></article>
            <article><span>Done</span><strong>{monthlyReport.done}</strong></article>
            <article><span>Active</span><strong>{monthlyReport.in_progress}</strong></article>
            <article><span>Blocked</span><strong>{monthlyReport.blocked}</strong></article>
          </div>

          <div className="report-grid">
            <div>
              <h3>{isLeader ? 'Members' : 'Progress'}</h3>
              <div className="report-list">
                {monthlyReport.members.length ? monthlyReport.members.map((member) => (
                  <article className="report-row" key={member.owner}>
                    <strong>{member.owner}</strong>
                    <span>{member.present_days} present · {member.absent_days} absent · {member.done}/{member.total} done · {member.points} pts</span>
                  </article>
                )) : <p className="empty-state">No work recorded this month.</p>}
              </div>
            </div>
            <div>
              <h3>Projects</h3>
              <div className="report-list">
                {monthlyReport.projects.length ? monthlyReport.projects.map((project) => (
                  <article className="report-row" key={project.project}>
                    <strong>{project.project}</strong>
                    <span>{project.done}/{project.total} done · {project.points} pts</span>
                  </article>
                )) : <p className="empty-state">No project work this month.</p>}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="work-grid">
        <form className="quick-add panel" onSubmit={handleTaskSubmit}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quick add</p>
              <h2>New task</h2>
            </div>
            {statusMessage && <span className="inline-status">{statusMessage}</span>}
          </div>

          <label className="span-2">
            Task
            <input name="task" value={taskForm.task} onChange={handleTaskChange} placeholder="What needs to move today?" required />
          </label>

          {isLeader ? (
            <label>
              Owner
              <input name="owner" value={taskForm.owner} onChange={handleTaskChange} placeholder={displayName} />
            </label>
          ) : null}

          <label>
            Status
            <select name="status" value={taskForm.status} onChange={handleTaskChange}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>

          <label>
            Date
            <input type="date" value={selectedDate} onChange={handleDateChange} />
          </label>

          <label>
            From
            <input name="start_time" type="time" value={taskForm.start_time} onChange={handleTaskChange} />
          </label>

          <label>
            To
            <input name="end_time" type="time" value={taskForm.end_time} onChange={handleTaskChange} />
          </label>

          <label className="span-2">
            Blocker
            <input name="blocker" value={taskForm.blocker} onChange={handleTaskChange} placeholder="Add reason only when status is Blocked" />
          </label>

          <button className="primary-button span-2" type="submit" disabled={loading}>Add task</button>
        </form>

        <section className="panel blockers-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Attention</p>
              <h2>Blockers</h2>
            </div>
            <span className="count-pill">{visibleBlockedTasks.length}</span>
          </div>

          <div className="compact-list">
            {visibleBlockedTasks.length ? visibleBlockedTasks.slice(0, 5).map((task) => (
              <article className="blocker-item" key={task.id}>
                <strong>{task.task}</strong>
                <span>{task.owner}</span>
                <p>{task.blocker}</p>
              </article>
            )) : <p className="empty-state">No blockers right now.</p>}
          </div>
        </section>
      </section>

      <section className="board-grid" aria-label="Tasks by status">
        {statuses.map((status) => (
          <section className="lane panel" key={status}>
            <div className="lane-heading">
              <h2>{status}</h2>
              <span>{tasksByStatus[status]?.length || 0}</span>
            </div>

            <div className="task-stack">
              {(tasksByStatus[status] || []).map((task) => (
                <article className={`task-card ${task.blocked ? 'blocked' : ''}`} key={task.id}>
                  <div className={`status-animation ${task.blocked ? 'blocked' : statusClass(task.status)}`} aria-hidden="true">
                    {task.blocked ? (
                      <span className="block-mark"></span>
                    ) : task.status === 'In Progress' ? (
                      <>
                        <span></span>
                        <span></span>
                        <span></span>
                      </>
                    ) : task.status === 'Done' ? (
                      <span className="done-mark"></span>
                    ) : (
                      <span className="backlog-mark"></span>
                    )}
                  </div>
                  <div className="task-card-top">
                    <span className={`status-dot ${statusClass(task.status)}`}></span>
                    <strong>{task.task}</strong>
                  </div>
                  <p>{task.owner}</p>
                  {task.blocker ? <div className="blocker-note">{task.blocker}</div> : null}
                  <div className="task-actions">
                    {statuses.filter((nextStatus) => nextStatus !== task.status).map((nextStatus) => (
                      <button key={nextStatus} type="button" onClick={() => updateTaskStatus(task.id, nextStatus)} disabled={loading}>
                        {nextStatus}
                      </button>
                    ))}
                  </div>
                </article>
              ))}

              {!tasksByStatus[status]?.length ? <p className="empty-state">Nothing here.</p> : null}
            </div>
          </section>
        ))}
      </section>

      <section className="panel chat-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h2>Daily updates</h2>
          </div>
          <div className="role-filters">
            {roleFilterOptions.map((role) => (
              <button key={role} type="button" className={filterRole === role ? 'active' : ''} onClick={() => setFilterRole(role)}>
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-stream">
          {visibleMessages.length ? visibleMessages.map((message) => (
            <article className={message.sender === user.username ? 'chat-bubble self' : 'chat-bubble'} key={message.id}>
              <div>
                <strong>{message.sender}</strong>
                <span>{message.sender_role} to {message.audience}</span>
              </div>
              <p>{message.content}</p>
            </article>
          )) : <p className="empty-state">No updates yet.</p>}
          <div ref={chatEndRef}></div>
        </div>

        <form className="chat-form" onSubmit={sendMessage}>
          <input name="content" value={chatForm.content} onChange={handleChatChange} placeholder="Post a short update" />
          <select name="audience" value={chatForm.audience} onChange={handleChatChange}>
            {roleFilterOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <button className="primary-button" type="submit" disabled={loading}>Send</button>
        </form>
      </section>
    </main>
  )
}

export default App
