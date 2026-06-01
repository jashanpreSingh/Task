import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000/api`
const roleFilterOptions = ['All', 'Admin', 'Manager', 'Member']
const statuses = ['Backlog', 'In Progress', 'Blocked', 'Done']
const errorStatuses = ['Open', 'Fixing', 'Resolved']
const errorSeverities = ['Low', 'Medium', 'High', 'Critical']
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
  assigned_to: '',
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

const initialErrorForm = {
  title: '',
  application: '',
  environment: '',
  severity: 'Medium',
  status: 'Open',
  symptoms: '',
  root_cause: '',
  solution: '',
  prevention: '',
}

const initialPasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

const itTabs = [
  { key: 'projects', label: 'Projects' },
  { key: 'servers', label: 'Servers' },
  { key: 'domains', label: 'Domains' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'employees', label: 'Employees' },
  { key: 'aiSubscriptions', label: 'AI Subs' },
  { key: 'risks', label: 'Risks' },
]

const itEndpoints = {
  projects: 'projects',
  servers: 'servers',
  domains: 'domains',
  accounts: 'accounts',
  employees: 'employees',
  aiSubscriptions: 'ai-subscriptions',
  risks: 'risks',
}

const initialItForms = {
  projects: {
    name: '',
    project_type: '',
    status: 'Active',
    owner: '',
    developer: '',
    client: '',
    repo_url: '',
    live_url: '',
    staging_url: '',
    backend_url: '',
    tech_stack: '',
    server: '',
    database_name: '',
    credential_location: '',
    last_reviewed: '',
    notes: '',
  },
  servers: {
    name: '',
    provider: '',
    ip_address: '',
    environment: 'Production',
    os: '',
    cpu: '',
    ram: '',
    disk: '',
    ssh_user: '',
    ssh_port: '',
    hosted_projects: '',
    backup_status: '',
    monitoring_status: '',
    credential_location: '',
    renewal_date: '',
    owner: '',
    last_checked: '',
    notes: '',
  },
  domains: {
    domain_name: '',
    registrar: '',
    expiry_date: '',
    dns_provider: '',
    linked_project: '',
    points_to: '',
    ssl_provider: '',
    ssl_expiry_date: '',
    renewal_owner: '',
    auto_renew: false,
    credential_location: '',
    last_reviewed: '',
    notes: '',
  },
  accounts: {
    account: '',
    purpose: '',
    provider: '',
    used_by_project: '',
    owner: '',
    recovery_contact: '',
    mfa_enabled: false,
    credential_location: '',
    renewal_date: '',
    last_reviewed: '',
    notes: '',
  },
  employees: {
    name: '',
    position: '',
    department: '',
    email: '',
    phone: '',
    manager: '',
    access_level: '',
    assigned_projects: '',
    status: 'Active',
    joining_date: '',
    notes: '',
  },
  aiSubscriptions: {
    tool_name: '',
    provider: '',
    plan: '',
    account_email: '',
    owner: '',
    assigned_users: '',
    monthly_cost: '',
    renewal_date: '',
    billing_cycle: '',
    status: 'Active',
    credential_location: '',
    usage_notes: '',
    cancellation_notes: '',
    last_reviewed: '',
  },
  risks: {
    title: '',
    category: '',
    severity: 'Medium',
    status: 'Open',
    owner: '',
    due_date: '',
    details: '',
    resolution: '',
  },
}

const itFieldGroups = {
  projects: [
    ['name', 'Project name', 'text'],
    ['project_type', 'Type', 'text'],
    ['status', 'Status', 'select', ['Active', 'Maintenance', 'Paused', 'Deprecated']],
    ['owner', 'Owner / manager', 'text'],
    ['developer', 'Developer / support', 'text'],
    ['client', 'Client / department', 'text'],
    ['repo_url', 'Repo / code location', 'text'],
    ['live_url', 'Live URL / domain', 'text'],
    ['staging_url', 'Staging URL / domain', 'text'],
    ['backend_url', 'Backend / admin URL', 'text'],
    ['tech_stack', 'Tech stack', 'textarea'],
    ['server', 'Server', 'text'],
    ['database_name', 'Database', 'text'],
    ['credential_location', 'Credential location', 'text'],
    ['last_reviewed', 'Last reviewed', 'date'],
    ['notes', 'Notes', 'textarea'],
  ],
  servers: [
    ['name', 'Server name', 'text'],
    ['provider', 'Provider', 'text'],
    ['ip_address', 'IP address', 'text'],
    ['environment', 'Environment', 'text'],
    ['os', 'OS', 'text'],
    ['cpu', 'CPU', 'text'],
    ['ram', 'RAM', 'text'],
    ['disk', 'Disk', 'text'],
    ['ssh_user', 'SSH user', 'text'],
    ['ssh_port', 'SSH port', 'text'],
    ['hosted_projects', 'Hosted projects', 'textarea'],
    ['backup_status', 'Backup status', 'text'],
    ['monitoring_status', 'Monitoring status', 'text'],
    ['credential_location', 'Credential location', 'text'],
    ['renewal_date', 'Renewal date', 'date'],
    ['owner', 'Owner', 'text'],
    ['last_checked', 'Last checked', 'date'],
    ['notes', 'Notes', 'textarea'],
  ],
  domains: [
    ['domain_name', 'Domain', 'text'],
    ['registrar', 'Registrar', 'text'],
    ['expiry_date', 'Domain expiry', 'date'],
    ['dns_provider', 'DNS provider', 'text'],
    ['linked_project', 'Linked project', 'text'],
    ['points_to', 'Points to', 'text'],
    ['ssl_provider', 'SSL provider', 'text'],
    ['ssl_expiry_date', 'SSL expiry', 'date'],
    ['renewal_owner', 'Renewal owner', 'text'],
    ['auto_renew', 'Auto renew', 'checkbox'],
    ['credential_location', 'Credential location', 'text'],
    ['last_reviewed', 'Last reviewed', 'date'],
    ['notes', 'Notes', 'textarea'],
  ],
  accounts: [
    ['account', 'Email / account', 'text'],
    ['purpose', 'Purpose', 'text'],
    ['provider', 'Provider', 'text'],
    ['used_by_project', 'Used by project', 'text'],
    ['owner', 'Owner', 'text'],
    ['recovery_contact', 'Recovery contact', 'text'],
    ['mfa_enabled', 'MFA enabled', 'checkbox'],
    ['credential_location', 'Credential location', 'text'],
    ['renewal_date', 'Renewal date', 'date'],
    ['last_reviewed', 'Last reviewed', 'date'],
    ['notes', 'Notes', 'textarea'],
  ],
  employees: [
    ['name', 'Employee name', 'text'],
    ['position', 'Position', 'text'],
    ['department', 'Department', 'text'],
    ['email', 'Email', 'email'],
    ['phone', 'Phone', 'text'],
    ['manager', 'Manager', 'text'],
    ['access_level', 'Access level', 'text'],
    ['assigned_projects', 'Assigned projects', 'textarea'],
    ['status', 'Status', 'select', ['Active', 'On Leave', 'Inactive']],
    ['joining_date', 'Joining date', 'date'],
    ['notes', 'Notes', 'textarea'],
  ],
  aiSubscriptions: [
    ['tool_name', 'Tool name', 'text'],
    ['provider', 'Provider', 'text'],
    ['plan', 'Plan', 'text'],
    ['account_email', 'Account email', 'email'],
    ['owner', 'Owner', 'text'],
    ['assigned_users', 'Assigned users', 'textarea'],
    ['monthly_cost', 'Monthly cost', 'text'],
    ['renewal_date', 'Renewal date', 'date'],
    ['billing_cycle', 'Billing cycle', 'text'],
    ['status', 'Status', 'select', ['Active', 'Trial', 'Paused', 'Cancelled']],
    ['credential_location', 'Credential location', 'text'],
    ['usage_notes', 'Usage notes', 'textarea'],
    ['cancellation_notes', 'Cancellation notes', 'textarea'],
    ['last_reviewed', 'Last reviewed', 'date'],
  ],
  risks: [
    ['title', 'Risk / missing info', 'text'],
    ['category', 'Category', 'text'],
    ['severity', 'Severity', 'select', ['Low', 'Medium', 'High', 'Critical']],
    ['status', 'Status', 'select', ['Open', 'In Progress', 'Resolved']],
    ['owner', 'Owner', 'text'],
    ['due_date', 'Due date', 'date'],
    ['details', 'Details', 'textarea'],
    ['resolution', 'Resolution', 'textarea'],
  ],
}

const itDisplayFields = {
  projects: [
    ['Live', 'live_url'],
    ['Backend', 'backend_url'],
    ['Server', 'server'],
    ['Database', 'database_name'],
    ['Developer', 'developer'],
    ['Credentials', 'credential_location'],
    ['Reviewed', 'last_reviewed'],
  ],
  servers: [
    ['IP', 'ip_address'],
    ['RAM', 'ram'],
    ['Disk', 'disk'],
    ['SSH', 'ssh_user'],
    ['Projects', 'hosted_projects'],
    ['Backup', 'backup_status'],
    ['Checked', 'last_checked'],
  ],
  domains: [
    ['Registrar', 'registrar'],
    ['Project', 'linked_project'],
    ['Points to', 'points_to'],
    ['Domain expiry', 'expiry_date'],
    ['SSL expiry', 'ssl_expiry_date'],
    ['Renew owner', 'renewal_owner'],
    ['Auto renew', 'auto_renew'],
  ],
  accounts: [
    ['Purpose', 'purpose'],
    ['Provider', 'provider'],
    ['Project', 'used_by_project'],
    ['Owner', 'owner'],
    ['Recovery', 'recovery_contact'],
    ['MFA', 'mfa_enabled'],
    ['Reviewed', 'last_reviewed'],
  ],
  employees: [
    ['Position', 'position'],
    ['Department', 'department'],
    ['Email', 'email'],
    ['Manager', 'manager'],
    ['Access', 'access_level'],
    ['Projects', 'assigned_projects'],
    ['Joined', 'joining_date'],
  ],
  aiSubscriptions: [
    ['Provider', 'provider'],
    ['Plan', 'plan'],
    ['Account', 'account_email'],
    ['Owner', 'owner'],
    ['Users', 'assigned_users'],
    ['Cost', 'monthly_cost'],
    ['Renewal', 'renewal_date'],
  ],
  risks: [
    ['Category', 'category'],
    ['Severity', 'severity'],
    ['Owner', 'owner'],
    ['Due', 'due_date'],
    ['Details', 'details'],
    ['Resolution', 'resolution'],
  ],
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
  const [errorSummary, setErrorSummary] = useState({ total: 0, open: 0, resolved: 0, critical: 0 })
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [dailyReview, setDailyReview] = useState({ date: '', members: [] })
  const [dailyErrors, setDailyErrors] = useState([])
  const [taskForm, setTaskForm] = useState(initialTaskForm)
  const [chatForm, setChatForm] = useState(initialChatForm)
  const [standupForm, setStandupForm] = useState(initialStandupForm)
  const [errorForm, setErrorForm] = useState(initialErrorForm)
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [itSummary, setItSummary] = useState(null)
  const [itData, setItData] = useState({ projects: [], servers: [], domains: [], accounts: [], employees: [], aiSubscriptions: [], risks: [] })
  const [itForms, setItForms] = useState(initialItForms)
  const [activeItTab, setActiveItTab] = useState('projects')
  const [editingItId, setEditingItId] = useState(null)
  const [itSearch, setItSearch] = useState('')
  const [reviewNotes, setReviewNotes] = useState({})
  const [editingErrorId, setEditingErrorId] = useState(null)
  const [isErrorDeskOpen, setIsErrorDeskOpen] = useState(false)
  const [isReviewDeskOpen, setIsReviewDeskOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isItRegisterOpen, setIsItRegisterOpen] = useState(false)
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

  const loadDailyErrors = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/errors/?date=${date}`)
    if (response.ok) setDailyErrors(data)
  }

  const loadErrorSummary = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/errors/summary/?date=${date}`)
    if (response.ok) setErrorSummary(data)
  }

  const loadMembers = async () => {
    const { response, data } = await fetchJson(`${API_BASE}/members/`)
    if (response.ok) setMembers(data)
  }

  const loadDailyReview = async (date = selectedDate) => {
    if (user?.role !== 'Admin') return
    const { response, data } = await fetchJson(`${API_BASE}/standups/daily-review/?date=${date}`)
    if (response.ok) setDailyReview(data)
  }

  const loadItRegister = async () => {
    if (user?.role !== 'Admin') return
    const [summaryResult, projectsResult, serversResult, domainsResult, accountsResult, employeesResult, aiSubscriptionsResult, risksResult] = await Promise.all([
      fetchJson(`${API_BASE}/it/summary/`),
      fetchJson(`${API_BASE}/it/projects/`),
      fetchJson(`${API_BASE}/it/servers/`),
      fetchJson(`${API_BASE}/it/domains/`),
      fetchJson(`${API_BASE}/it/accounts/`),
      fetchJson(`${API_BASE}/it/employees/`),
      fetchJson(`${API_BASE}/it/ai-subscriptions/`),
      fetchJson(`${API_BASE}/it/risks/`),
    ])
    if (summaryResult.response.ok) setItSummary(summaryResult.data)
    setItData({
      projects: projectsResult.response.ok ? projectsResult.data : [],
      servers: serversResult.response.ok ? serversResult.data : [],
      domains: domainsResult.response.ok ? domainsResult.data : [],
      accounts: accountsResult.response.ok ? accountsResult.data : [],
      employees: employeesResult.response.ok ? employeesResult.data : [],
      aiSubscriptions: aiSubscriptionsResult.response.ok ? aiSubscriptionsResult.data : [],
      risks: risksResult.response.ok ? risksResult.data : [],
    })
  }

  const loadMonthlyReport = async (month = selectedMonth) => {
    const { response, data } = await fetchJson(`${API_BASE}/tasks/monthly-report/?month=${month}`)
    if (response.ok) setMonthlyReport(data)
  }

  const refreshData = async (includeMessages = Boolean(user), date = selectedDate) => {
    const loaders = [loadTasks(date), loadSummary(date), loadDailyErrors(date), loadErrorSummary(date), loadMonthlyReport()]
    if (includeMessages) loaders.push(loadMessages(date), loadMembers())
    if (user?.role === 'Admin') loaders.push(loadDailyReview(date))
    await Promise.all(loaders)
  }

  useEffect(() => {
    const bootstrap = async () => {
      const { response, data } = await fetchJson(`${API_BASE}/auth/session/`)

      if (response.ok && data.authenticated) {
        setUser(data)
        setTaskForm((current) => ({ ...current, owner: data.display_name }))
        setTaskScope(leaderRoles.includes(data.role) ? 'team' : 'mine')
        const [tasksResult, summaryResult, messagesResult, membersResult, reportResult, errorsResult, errorSummaryResult, reviewResult] = await Promise.all([
          fetchJson(`${API_BASE}/tasks/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/tasks/summary/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/messages/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/members/`),
          fetchJson(`${API_BASE}/tasks/monthly-report/?month=${selectedMonth}`),
          fetchJson(`${API_BASE}/errors/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/errors/summary/?date=${selectedDate}`),
          data.role === 'Admin' ? fetchJson(`${API_BASE}/standups/daily-review/?date=${selectedDate}`) : Promise.resolve({ response: { ok: false }, data: null }),
        ])
        if (tasksResult.response.ok) setTasks(tasksResult.data)
        if (summaryResult.response.ok) setSummary(summaryResult.data)
        if (messagesResult.response.ok) setMessages(messagesResult.data)
        if (membersResult.response.ok) setMembers(membersResult.data)
        if (reportResult.response.ok) setMonthlyReport(reportResult.data)
        if (errorsResult.response.ok) setDailyErrors(errorsResult.data)
        if (errorSummaryResult.response.ok) setErrorSummary(errorSummaryResult.data)
        if (reviewResult.response.ok) setDailyReview(reviewResult.data)
      } else {
        setUser(null)
        setTasks([])
        setMessages([])
        setMembers([])
        setDailyReview({ date: '', members: [] })
        setDailyErrors([])
        setErrorSummary({ total: 0, open: 0, resolved: 0, critical: 0 })
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
  const openDailyErrors = useMemo(() => dailyErrors.filter((error) => !['Resolved', 'Prevented'].includes(error.status)), [dailyErrors])

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

  const assignableMembers = useMemo(() => {
    return members.filter((member) => member.role === 'Member')
  }, [members])

  const dailyProgress = useMemo(() => {
    const selectedDay = new Date(`${selectedDate}T00:00:00`)
    const isSunday = selectedDay.getDay() === 0
    const memberNames = members
      .filter((member) => member.role === 'Member')
      .map((member) => member.display_name || member.username)
    const memberNameSet = new Set(memberNames.map((name) => name.toLowerCase()))
    const progressTasks = memberNameSet.size
      ? tasks.filter((task) => memberNameSet.has((task.owner || '').toLowerCase()))
      : tasks
    const total = progressTasks.length
    const done = progressTasks.filter((task) => task.status === 'Done').length
    const active = progressTasks.filter((task) => task.status === 'In Progress').length
    const blocked = progressTasks.filter((task) => task.status === 'Blocked').length
    const percent = total ? Math.round((done / total) * 100) : 0
    const memberMap = progressTasks.reduce((grouped, task) => {
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

    const knownMembers = memberNames.length
      ? memberNames
      : Object.keys(memberMap)

    const attendanceByMember = dailyReview.members.reduce((grouped, member) => {
      grouped[(member.user_name || member.username || '').toLowerCase()] = member.attendance
      return grouped
    }, {})

    const memberRows = knownMembers.map((owner) => {
      const row = memberMap[owner] || { owner, total: 0, done: 0, active: 0, blocked: 0, points: 0 }
      const attendance = isSunday ? 'Holiday' : attendanceByMember[owner.toLowerCase()] || (row.total > 0 ? 'Present' : 'Absent')
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
  }, [dailyReview.members, members, selectedDate, tasks])

  const dailyUpdateStats = useMemo(() => {
    const reviewMembers = dailyReview.members || []
    const submitted = reviewMembers.filter((member) => member.attendance === 'Present' && member.standup)
    const absent = reviewMembers.filter((member) => member.attendance === 'Absent')
    const pending = submitted.filter((member) => member.standup?.review_status === 'Pending Review')
    const blockers = submitted.filter((member) => member.standup?.blocker?.trim())
    const repeated = submitted.filter((member) => member.standup?.review_status === 'Duplicate / Repeated')
    const reviewed = submitted.filter((member) => member.standup?.review_status === 'Reviewed')
    const percent = reviewMembers.length ? Math.round((submitted.length / reviewMembers.length) * 100) : 0

    return {
      submitted,
      absent,
      pending,
      blockers,
      repeated,
      reviewed,
      percent,
      totalMembers: reviewMembers.length,
    }
  }, [dailyReview.members])

  const today = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${selectedDate}T00:00:00`))
  const flowCopy = isLeader
    ? 'Assign work, spot blockers, and move the team forward.'
    : 'See your tasks, update progress, and flag blockers fast.'
  const activeItFields = itFieldGroups[activeItTab]
  const activeItRecords = useMemo(() => {
    const records = itData[activeItTab] || []
    const query = itSearch.trim().toLowerCase()
    if (!query) return records
    return records.filter((record) => Object.values(record).some((value) => String(value || '').toLowerCase().includes(query)))
  }, [activeItTab, itData, itSearch])
  const renderItField = ([name, label, type, options]) => {
    const value = itForms[activeItTab][name]
    if (type === 'textarea') {
      return (
        <label className="span-2" key={name}>
          {label}
          <textarea name={name} value={value || ''} onChange={handleItChange} rows="3" />
        </label>
      )
    }
    if (type === 'select') {
      return (
        <label key={name}>
          {label}
          <select name={name} value={value || ''} onChange={handleItChange}>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      )
    }
    if (type === 'checkbox') {
      return (
        <label className="checkbox-field" key={name}>
          <input name={name} type="checkbox" checked={Boolean(value)} onChange={handleItChange} />
          {label}
        </label>
      )
    }
    return (
      <label key={name}>
        {label}
        <input name={name} type={type} value={value || ''} onChange={handleItChange} />
      </label>
    )
  }
  const getItTitle = (record) => record.name || record.domain_name || record.account || record.tool_name || record.title
  const getItMeta = (record) => [
    record.status,
    record.project_type,
    record.position,
    record.department,
    record.plan,
    record.provider,
    record.environment,
    record.owner,
    record.renewal_date ? `Renews ${record.renewal_date}` : '',
    record.expiry_date ? `Expires ${record.expiry_date}` : '',
  ].filter(Boolean).join(' · ')
  const formatItValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return value || ''
  }
  const getItNotes = (record) => record.notes || record.details || record.tech_stack || record.hosted_projects || record.usage_notes || record.cancellation_notes || ''
  const getItFields = (record) => (itDisplayFields[activeItTab] || [])
    .map(([label, key]) => [label, formatItValue(record[key])])
    .filter(([, value]) => value)

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

  const handleErrorChange = (event) => {
    const { name, value } = event.target
    setErrorForm((current) => ({ ...current, [name]: value }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  const handleReviewNoteChange = (memberKey, value) => {
    setReviewNotes((current) => ({ ...current, [memberKey]: value }))
  }

  const handleItChange = (event) => {
    const { name, type, checked, value } = event.target
    setItForms((current) => ({
      ...current,
      [activeItTab]: {
        ...current[activeItTab],
        [name]: type === 'checkbox' ? checked : value,
      },
    }))
  }

  const openItRegister = async () => {
    setIsItRegisterOpen(true)
    await loadItRegister()
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
      setDailyErrors([])
      setDailyReview({ date: '', members: [] })
      setErrorSummary({ total: 0, open: 0, resolved: 0, critical: 0 })
      setIsErrorDeskOpen(false)
      setIsReviewDeskOpen(false)
      setIsPasswordModalOpen(false)
      setIsItRegisterOpen(false)
      setPasswordForm(initialPasswordForm)
      setAuthMessage('Signed out')
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const { response, data } = await fetchJson(`${API_BASE}/auth/change-password/`, {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      })

      if (!response.ok) throw new Error(data?.detail || 'Could not change password')

      setPasswordForm(initialPasswordForm)
      setIsPasswordModalOpen(false)
      setStatusMessage('Password changed')
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submitItRecord = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const endpoint = itEndpoints[activeItTab]
      const payload = { ...itForms[activeItTab] }
      const dateFields = activeItFields.filter(([, , type]) => type === 'date').map(([name]) => name)
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '' && dateFields.includes(key)) payload[key] = null
      })
      const url = editingItId ? `${API_BASE}/it/${endpoint}/${editingItId}/` : `${API_BASE}/it/${endpoint}/`
      const { response, data } = await fetchJson(url, {
        method: editingItId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(data?.detail || 'Could not save IT record')

      setItForms((current) => ({ ...current, [activeItTab]: initialItForms[activeItTab] }))
      setEditingItId(null)
      setStatusMessage('IT Register saved')
      await loadItRegister()
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const editItRecord = (record) => {
    const cleanRecord = { ...initialItForms[activeItTab] }
    Object.keys(cleanRecord).forEach((key) => {
      cleanRecord[key] = record[key] ?? initialItForms[activeItTab][key]
    })
    setItForms((current) => ({ ...current, [activeItTab]: cleanRecord }))
    setEditingItId(record.id)
  }

  const cancelItEdit = () => {
    setItForms((current) => ({ ...current, [activeItTab]: initialItForms[activeItTab] }))
    setEditingItId(null)
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
      if (!payload.assigned_to) delete payload.assigned_to

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

  const handleErrorSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const url = editingErrorId ? `${API_BASE}/errors/${editingErrorId}/` : `${API_BASE}/errors/`
      const payload = {
        ...errorForm,
        status: editingErrorId ? errorForm.status : 'Open',
        work_date: selectedDate,
      }
      const { response } = await fetchJson(url, {
        method: editingErrorId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Unable to save error')

      setErrorForm(initialErrorForm)
      setEditingErrorId(null)
      setStatusMessage(editingErrorId ? 'Fix details saved' : 'Issue logged')
      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const editDailyError = (error) => {
    setEditingErrorId(error.id)
    setErrorForm({
      title: error.title || '',
      application: error.application || '',
      environment: error.environment || '',
      severity: error.severity || 'Medium',
      status: error.status || 'Open',
      symptoms: error.symptoms || '',
      root_cause: error.root_cause || '',
      solution: error.solution || '',
      prevention: error.prevention || '',
    })
  }

  const cancelErrorEdit = () => {
    setEditingErrorId(null)
    setErrorForm(initialErrorForm)
  }

  const updateErrorStatus = async (errorId, status) => {
    setLoading(true)
    setStatusMessage('')

    try {
      const { response } = await fetchJson(`${API_BASE}/errors/${errorId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('Unable to update error')

      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const markErrorSeen = async (errorId) => {
    setLoading(true)
    setStatusMessage('')

    try {
      const { response } = await fetchJson(`${API_BASE}/errors/${errorId}/mark-seen/`, {
        method: 'POST',
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error('Unable to mark recurrence')

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

  const reviewStandup = async (standupId, reviewStatus, reviewNote, sendFeedback = false) => {
    setLoading(true)
    setStatusMessage('')

    try {
      const { response } = await fetchJson(`${API_BASE}/standups/${standupId}/review/`, {
        method: 'PATCH',
        body: JSON.stringify({
          review_status: reviewStatus,
          review_note: reviewNote,
          send_feedback: sendFeedback,
        }),
      })

      if (!response.ok) throw new Error('Could not save review')

      setStatusMessage('Review saved')
      setReviewNotes((current) => {
        const next = { ...current }
        delete next[standupId]
        return next
      })
      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const sendStandupReminder = async (member, reviewNote) => {
    setLoading(true)
    setStatusMessage('')

    try {
      const { response } = await fetchJson(`${API_BASE}/standups/send-reminder/`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: member.user_id,
          work_date: selectedDate,
          review_note: reviewNote,
        }),
      })

      if (!response.ok) throw new Error('Could not send reminder')

      setStatusMessage('Reminder sent')
      setReviewNotes((current) => {
        const next = { ...current }
        delete next[`absent-${member.user_id}`]
        return next
      })
      await refreshData(true)
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
        <div className="header-copy">
          <p className="eyebrow">{today}</p>
          <h1>Team Board</h1>
          <p>{flowCopy}</p>
        </div>
        <div className="user-menu">
          <div className="date-controls">
            <label className="date-picker">
              Work date
              <input type="date" value={selectedDate} onChange={handleDateChange} />
            </label>
            <label className="date-picker">
              Report month
              <input type="month" value={selectedMonth} onChange={handleMonthChange} />
            </label>
          </div>
          <div className="header-actions">
            <div className="identity-pill">
              <span>{displayName}</span>
              <strong>{user.role}</strong>
            </div>
            {user.role === 'Admin' ? (
              <>
                <button className="it-register-button" type="button" onClick={openItRegister}>
                  IT Register
                </button>
                <button className="review-desk-button" type="button" onClick={() => setIsReviewDeskOpen(true)}>
                  Review desk
                </button>
              </>
            ) : null}
            <button className="error-desk-button" type="button" onClick={() => setIsErrorDeskOpen(true)}>
              Error desk {openDailyErrors.length ? <span>{openDailyErrors.length}</span> : null}
            </button>
            <button type="button" onClick={() => setIsPasswordModalOpen(true)}>Password</button>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <section className="metrics-row" aria-label="Team summary">
        {user.role === 'Admin' ? (
          <>
            <article>
              <span>Submitted</span>
              <strong>{dailyUpdateStats.submitted.length}/{dailyUpdateStats.totalMembers}</strong>
            </article>
            <article className={dailyUpdateStats.absent.length ? 'needs-attention' : ''}>
              <span>Absent</span>
              <strong>{dailyUpdateStats.absent.length}</strong>
            </article>
            <article className={dailyUpdateStats.pending.length ? 'needs-attention' : ''}>
              <span>Pending review</span>
              <strong>{dailyUpdateStats.pending.length}</strong>
            </article>
            <article className={dailyUpdateStats.blockers.length ? 'needs-attention' : ''}>
              <span>Update blockers</span>
              <strong>{dailyUpdateStats.blockers.length}</strong>
            </article>
          </>
        ) : (
          <>
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
          </>
        )}
      </section>

      <section className="flow-bar" aria-label="Work mode">
        <div>
          <strong>{user.role === 'Admin' ? `${dailyUpdateStats.percent}% submitted today` : isLeader ? 'Team control' : 'My daily work'}</strong>
          <span>{user.role === 'Admin' ? `${dailyUpdateStats.submitted.length} updates in, ${dailyUpdateStats.absent.length} still missing.` : flowCopy}</span>
        </div>
        <div className="scope-toggle">
          {user.role === 'Admin' ? (
            <button type="button" onClick={() => setIsReviewDeskOpen(true)}>
              Review desk
            </button>
          ) : null}
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

      {user.role === 'Admin' ? (
        <section className="updates-dashboard-grid" aria-label="Daily update dashboard">
          <section className="today-updates-panel panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Today</p>
                <h2>Work updates</h2>
              </div>
              <span className="count-pill">{dailyUpdateStats.submitted.length} submitted</span>
            </div>

            <div className="update-feed">
              {dailyUpdateStats.submitted.length ? dailyUpdateStats.submitted.map((member) => (
                <article className="update-card" key={member.user_id}>
                  <div className="update-card-top">
                    <div>
                      <strong>{member.user_name}</strong>
                      <span>{member.standup.review_status}</span>
                    </div>
                    <span className={`attendance-pill ${member.attendance.toLowerCase()}`}>{member.attendance}</span>
                  </div>
                  {member.standup.yesterday ? (
                    <div className="update-note">
                      <strong>Yesterday</strong>
                      <p>{member.standup.yesterday}</p>
                    </div>
                  ) : null}
                  <div className="update-note primary">
                    <strong>Today</strong>
                    <p>{member.standup.today || 'No details added.'}</p>
                  </div>
                  {member.standup.blocker ? (
                    <div className="update-note blocker">
                      <strong>Blocker</strong>
                      <p>{member.standup.blocker}</p>
                    </div>
                  ) : null}
                </article>
              )) : <p className="empty-state">No daily updates submitted for this date.</p>}
            </div>
          </section>

          <aside className="attendance-panel panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Attendance</p>
                <h2>Missing updates</h2>
              </div>
              <span className="count-pill">{dailyUpdateStats.absent.length}</span>
            </div>

            <div className="absent-list">
              {dailyUpdateStats.absent.length ? dailyUpdateStats.absent.map((member) => {
                const noteKey = `absent-${member.user_id}`
                const note = reviewNotes[noteKey] || ''
                return (
                  <article className="absent-card" key={member.user_id}>
                    <div>
                      <strong>{member.user_name}</strong>
                      <span>{member.role}</span>
                    </div>
                    <textarea
                      value={note}
                      onChange={(event) => handleReviewNoteChange(noteKey, event.target.value)}
                      placeholder="Reminder message"
                      rows="2"
                    />
                    <button type="button" onClick={() => sendStandupReminder(member, note)} disabled={loading}>Send reminder</button>
                  </article>
                )
              }) : <p className="empty-state">Everyone has submitted today.</p>}
            </div>

            <div className="review-breakdown">
              <span>{dailyUpdateStats.reviewed.length} reviewed</span>
              <span>{dailyUpdateStats.pending.length} pending</span>
              <span>{dailyUpdateStats.repeated.length} repeated</span>
            </div>
          </aside>
        </section>
      ) : null}

      <section className={`collaboration-grid ${isLeader && visibleTasks.length ? '' : 'single'}`}>
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

        {isLeader && visibleTasks.length ? (
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
            <article><span>Submitted days</span><strong>{monthlyReport.members.reduce((sum, member) => sum + member.present_days, 0)}</strong></article>
            <article><span>Members</span><strong>{monthlyReport.members.length}</strong></article>
            <article><span>Working days</span><strong>{monthlyReport.working_days}</strong></article>
            <article><span>Tasks</span><strong>{monthlyReport.total}</strong></article>
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

      {isLeader || visibleTasks.length || visibleBlockedTasks.length ? (
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
              Assign to
              <select name="assigned_to" value={taskForm.assigned_to} onChange={handleTaskChange}>
                <option value="">Choose member</option>
                {assignableMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.display_name || member.username}
                  </option>
                ))}
              </select>
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
      ) : null}

      {isReviewDeskOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="daily-review-modal panel" role="dialog" aria-modal="true" aria-label="Daily updates review">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Admin review</p>
                <h2>Daily updates review</h2>
              </div>
              <div className="modal-actions">
                <div className="review-summary">
                  <span>{dailyReview.members.filter((member) => member.attendance === 'Present').length} present</span>
                  <span>{dailyReview.members.filter((member) => member.attendance === 'Absent').length} absent</span>
                  {statusMessage && <span>{statusMessage}</span>}
                </div>
                <button type="button" className="close-button" onClick={() => setIsReviewDeskOpen(false)} aria-label="Close review desk">
                  X
                </button>
              </div>
            </div>

            <div className="review-list">
              {dailyReview.members.length ? dailyReview.members.map((member) => {
                const standup = member.standup
                const noteKey = standup?.id || `absent-${member.user_id}`
                const note = reviewNotes[noteKey] ?? standup?.review_note ?? ''
                return (
                  <article className={`review-row ${member.attendance.toLowerCase()}`} key={member.user_id}>
                    <div className="review-member">
                      <strong>{member.user_name}</strong>
                      <span>{member.role}</span>
                      <span className={`attendance-pill ${member.attendance.toLowerCase()}`}>{member.attendance}</span>
                    </div>

                    <div className="review-update">
                      {standup ? (
                        <>
                          <div>
                            <strong>Yesterday</strong>
                            <p>{standup.yesterday || 'No update'}</p>
                          </div>
                          <div>
                            <strong>Today</strong>
                            <p>{standup.today || 'No update'}</p>
                          </div>
                          <div>
                            <strong>Blocker</strong>
                            <p>{standup.blocker || 'None'}</p>
                          </div>
                        </>
                      ) : (
                        <p className="empty-state">No daily update submitted.</p>
                      )}
                    </div>

                    <div className="review-control">
                      <span>{standup?.review_status || 'Not submitted'}</span>
                      <textarea
                        value={note}
                        onChange={(event) => handleReviewNoteChange(noteKey, event.target.value)}
                        placeholder={standup ? 'Admin note for this update' : 'Reminder message'}
                        rows="2"
                      />
                      <div className="review-actions">
                        {standup ? (
                          <>
                            <button type="button" onClick={() => reviewStandup(standup.id, 'Reviewed', note, false)} disabled={loading}>Reviewed</button>
                            <button type="button" onClick={() => reviewStandup(standup.id, 'Duplicate / Repeated', note || 'Your daily update looks repeated. Please update it with today\'s actual work.', true)} disabled={loading}>Same again</button>
                            <button type="button" onClick={() => reviewStandup(standup.id, 'Needs Clarification', note || 'Please review your daily update and add clearer details.', true)} disabled={loading}>Please review</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => sendStandupReminder(member, note)} disabled={loading}>Send reminder</button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              }) : <p className="empty-state">No members available for review.</p>}
            </div>
          </section>
        </div>
      ) : null}

      {isPasswordModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="password-modal panel" role="dialog" aria-modal="true" aria-label="Change password">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Change password</h2>
              </div>
              <button type="button" className="close-button" onClick={() => setIsPasswordModalOpen(false)} aria-label="Close password form">
                X
              </button>
            </div>

            <form className="password-form" onSubmit={handlePasswordSubmit}>
              <label>
                Current password
                <input name="current_password" type="password" value={passwordForm.current_password} onChange={handlePasswordChange} autoComplete="current-password" required />
              </label>
              <label>
                New password
                <input name="new_password" type="password" value={passwordForm.new_password} onChange={handlePasswordChange} autoComplete="new-password" required />
              </label>
              <label>
                Confirm new password
                <input name="confirm_password" type="password" value={passwordForm.confirm_password} onChange={handlePasswordChange} autoComplete="new-password" required />
              </label>
              {statusMessage ? <p className="form-message">{statusMessage}</p> : null}
              <button className="primary-button" type="submit" disabled={loading}>Update password</button>
            </form>
          </section>
        </div>
      ) : null}

      {isItRegisterOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="it-register-modal panel" role="dialog" aria-modal="true" aria-label="IT Register">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Admin only</p>
                <h2>IT Register</h2>
              </div>
              <div className="modal-actions">
                <button type="button" className="close-button" onClick={() => setIsItRegisterOpen(false)} aria-label="Close IT Register">
                  X
                </button>
              </div>
            </div>

            <div className="it-summary-grid">
              <article><span>Projects</span><strong>{itSummary?.projects || 0}</strong></article>
              <article><span>Servers</span><strong>{itSummary?.servers || 0}</strong></article>
              <article><span>Domains</span><strong>{itSummary?.domains || 0}</strong></article>
              <article><span>Employees</span><strong>{itSummary?.employees || 0}</strong></article>
              <article><span>AI subs</span><strong>{itSummary?.ai_subscriptions || 0}</strong></article>
              <article className={itSummary?.open_risks ? 'needs-attention' : ''}><span>Open risks</span><strong>{itSummary?.open_risks || 0}</strong></article>
            </div>

            <div className="it-register-layout">
              <aside className="it-sidebar">
                <div className="it-tabs">
                  {itTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={activeItTab === tab.key ? 'active' : ''}
                      onClick={() => {
                        setActiveItTab(tab.key)
                        setEditingItId(null)
                        setItSearch('')
                      }}
                    >
                      <span>{tab.label}</span>
                      <strong>{itData[tab.key]?.length || 0}</strong>
                    </button>
                  ))}
                </div>

                <div className="it-risks-box">
                  <strong>Needs attention</strong>
                  {(itSummary?.missing || []).length ? itSummary.missing.map((item) => <span key={item}>{item}</span>) : <span>No missing critical info.</span>}
                </div>
              </aside>

              <section className="it-main">
                <div className="it-table-heading">
                  <div>
                    <p className="eyebrow">View</p>
                    <h2>{itTabs.find((tab) => tab.key === activeItTab)?.label}</h2>
                  </div>
                  <label className="it-search">
                    Search
                    <input value={itSearch} onChange={(event) => setItSearch(event.target.value)} placeholder="Project, domain, owner, email..." />
                  </label>
                </div>

                <div className="it-record-list">
                  {activeItRecords.length ? activeItRecords.map((record) => {
                    const notes = getItNotes(record)
                    const fields = getItFields(record)
                    return (
                      <article className="it-record-card" key={record.id}>
                        <div className="it-record-top">
                          <div>
                            <strong>{getItTitle(record)}</strong>
                            <span>{getItMeta(record) || 'No details yet'}</span>
                          </div>
                          <button type="button" onClick={() => editItRecord(record)}>Edit</button>
                        </div>
                        {fields.length ? (
                          <div className="it-field-grid">
                            {fields.map(([label, value]) => (
                              <div key={`${record.id}-${label}`}>
                                <span>{label}</span>
                                <strong>{value}</strong>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {notes ? <p>{notes}</p> : <p className="muted-note">Add notes so another manager can understand this quickly.</p>}
                      </article>
                    )
                  }) : <p className="empty-state">No records found in this tab.</p>}
                </div>
              </section>

              <aside className="it-editor">
                <form className="it-form" onSubmit={submitItRecord}>
                  <div className="panel-heading span-2 it-editor-heading">
                    <div>
                      <p className="eyebrow">{editingItId ? 'Update' : 'Add'}</p>
                      <h2>{itTabs.find((tab) => tab.key === activeItTab)?.label}</h2>
                    </div>
                    {statusMessage ? <span className="inline-status">{statusMessage}</span> : null}
                  </div>
                  {activeItFields.map(renderItField)}
                  <div className="it-form-actions span-2">
                    <button className="primary-button" type="submit" disabled={loading}>{editingItId ? 'Save changes' : 'Add record'}</button>
                    {editingItId ? <button type="button" onClick={cancelItEdit} disabled={loading}>Cancel</button> : null}
                  </div>
                </form>
              </aside>
            </div>
          </section>
        </div>
      ) : null}

      {isErrorDeskOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="error-desk-modal panel" role="dialog" aria-modal="true" aria-label="Recurring error desk">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Error desk</p>
                <h2>Recurring issues</h2>
              </div>
              <div className="modal-actions">
                <div className="error-summary-pills">
                  <span>{errorSummary.total} logged</span>
                  <span>{errorSummary.open} open</span>
                  <span>{errorSummary.critical} critical</span>
                  <span>{errorSummary.resolved} fixed</span>
                </div>
                <button type="button" className="close-button" onClick={() => setIsErrorDeskOpen(false)} aria-label="Close error desk">
                  X
                </button>
              </div>
            </div>

            <div className="error-desk-grid">
              <form className="error-form" onSubmit={handleErrorSubmit}>
                <label>
                  Issue
                  <input name="title" value={errorForm.title} onChange={handleErrorChange} placeholder="JSAP session token error" required />
                </label>
                <label>
                  Application
                  <input name="application" value={errorForm.application} onChange={handleErrorChange} placeholder="JSAP, Billing API, Admin panel" required />
                </label>
                <label>
                  Severity
                  <select name="severity" value={errorForm.severity} onChange={handleErrorChange}>
                    {errorSeverities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                  </select>
                </label>
                <label>
                  What happened
                  <textarea name="symptoms" value={errorForm.symptoms} onChange={handleErrorChange} placeholder="User impact, screen, logs, exact message" rows="3" />
                </label>
                {editingErrorId ? (
                  <>
                    <label>
                      Environment
                      <input name="environment" value={errorForm.environment} onChange={handleErrorChange} placeholder="Production, staging, client device" />
                    </label>
                    <label>
                      Status
                      <select name="status" value={errorForm.status} onChange={handleErrorChange}>
                        {errorStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label>
                      Why it happened
                      <textarea name="root_cause" value={errorForm.root_cause} onChange={handleErrorChange} placeholder="Root cause" rows="3" />
                    </label>
                    <label>
                      Fix applied
                      <textarea name="solution" value={errorForm.solution} onChange={handleErrorChange} placeholder="Fix applied or next action" rows="3" />
                    </label>
                    <label>
                      Stop it next time
                      <textarea name="prevention" value={errorForm.prevention} onChange={handleErrorChange} placeholder="Test, monitor, checklist, owner, or process change" rows="3" />
                    </label>
                  </>
                ) : null}
                <div className="error-form-actions">
                  <button className="primary-button" type="submit" disabled={loading}>{editingErrorId ? 'Save fix' : 'Log issue'}</button>
                  {editingErrorId ? <button type="button" onClick={cancelErrorEdit} disabled={loading}>Cancel</button> : null}
                </div>
              </form>

              <div className="error-list">
                {dailyErrors.length ? dailyErrors.map((error) => (
                  <article className={`error-card severity-${error.severity.toLowerCase()}`} key={error.id}>
                    <div className="error-card-top">
                      <div>
                        <strong>{error.title}</strong>
                        <span>{error.application}{error.environment ? ` · ${error.environment}` : ''}</span>
                      </div>
                      <div className="error-badges">
                        <span>{error.severity}</span>
                        <span>{error.status}</span>
                        <span>Seen {error.occurrence_count}x</span>
                      </div>
                    </div>
                    {error.symptoms ? <p>{error.symptoms}</p> : null}
                    {error.root_cause || error.solution || error.prevention ? (
                      <div className="error-fix-summary">
                        {error.root_cause ? <div className="error-note"><strong>Why</strong><span>{error.root_cause}</span></div> : null}
                        {error.solution ? <div className="error-note"><strong>Fix</strong><span>{error.solution}</span></div> : null}
                        {error.prevention ? <div className="error-note"><strong>Next time</strong><span>{error.prevention}</span></div> : null}
                      </div>
                    ) : null}
                    <div className="error-footer">
                      <span>Reported by {error.reporter_name}</span>
                      <div className="task-actions">
                        <button type="button" onClick={() => markErrorSeen(error.id)} disabled={loading}>
                          Seen again
                        </button>
                        <button type="button" onClick={() => editDailyError(error)} disabled={loading}>
                          Add fix
                        </button>
                        {error.status !== 'Fixing' ? <button type="button" onClick={() => updateErrorStatus(error.id, 'Fixing')} disabled={loading}>Fixing</button> : null}
                        {error.status !== 'Resolved' ? <button type="button" onClick={() => updateErrorStatus(error.id, 'Resolved')} disabled={loading}>Resolved</button> : null}
                      </div>
                    </div>
                  </article>
                )) : <p className="empty-state">No application errors logged for this date.</p>}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {visibleTasks.length ? (
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
                  <p>{task.assigned_to_name || task.owner}</p>
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
      ) : null}

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
                <span>{message.sender_role} to {message.recipient_name || message.audience}</span>
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
