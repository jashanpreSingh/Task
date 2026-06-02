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
  project: '',
  status: 'Backlog',
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

const initialAdminMemberForm = {
  member_id: '',
  display_name: '',
  username: '',
  role: 'Member',
  new_password: '',
}

const initialLearningForm = {
  work_date: todayValue(),
  topic: '',
  category: '',
  summary: '',
  source: '',
  time_spent_minutes: '',
  confidence: 'Practicing',
  next_step: '',
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
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [tasks, setTasks] = useState([])
  const [upcomingWork, setUpcomingWork] = useState([])
  const [projects, setProjects] = useState([])
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
  const [adminMemberForm, setAdminMemberForm] = useState(initialAdminMemberForm)
  const [learningForm, setLearningForm] = useState(initialLearningForm)
  const [learningEntries, setLearningEntries] = useState([])
  const [learningReport, setLearningReport] = useState(null)
  const [learningUserId, setLearningUserId] = useState('all')
  const [itSummary, setItSummary] = useState(null)
  const [itData, setItData] = useState({ projects: [], servers: [], domains: [], accounts: [], employees: [], aiSubscriptions: [], risks: [] })
  const [itForms, setItForms] = useState(initialItForms)
  const [activeItTab, setActiveItTab] = useState('projects')
  const [editingItId, setEditingItId] = useState(null)
  const [itSearch, setItSearch] = useState('')
  const [reviewNotes, setReviewNotes] = useState({})
  const [editingErrorId, setEditingErrorId] = useState(null)
  const [editingUpcomingId, setEditingUpcomingId] = useState(null)
  const [upcomingEditForm, setUpcomingEditForm] = useState(initialTaskForm)
  const [isErrorDeskOpen, setIsErrorDeskOpen] = useState(false)
  const [isReviewDeskOpen, setIsReviewDeskOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isItRegisterOpen, setIsItRegisterOpen] = useState(false)
  const [isLearningDeskOpen, setIsLearningDeskOpen] = useState(false)
  const [filterRole, setFilterRole] = useState('All')
  const [upcomingProjectFilter, setUpcomingProjectFilter] = useState('all')
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState('open')
  const [upcomingAssignmentFilter, setUpcomingAssignmentFilter] = useState('all')
  const [issueSearch, setIssueSearch] = useState('')
  const [taskScope, setTaskScope] = useState('team')
  const [selectedDate, setSelectedDate] = useState(todayValue)
  const [selectedMonth, setSelectedMonth] = useState(monthValue)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
      window.scrollTo({ top: 0, left: 0 })
    }
  }, [])

  const loadTasks = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/tasks/?date=${date}`)
    if (response.ok) setTasks(data)
  }

  const loadUpcomingWork = async (date = selectedDate) => {
    const { response, data } = await fetchJson(`${API_BASE}/tasks/upcoming/?from=${date}&days=30`)
    if (response.ok) setUpcomingWork(data)
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

  const loadProjects = async () => {
    const { response, data } = await fetchJson(`${API_BASE}/projects/`)
    if (response.ok) setProjects(data)
  }

  const loadDailyReview = async (date = selectedDate) => {
    if (user?.role !== 'Admin') return
    const { response, data } = await fetchJson(`${API_BASE}/standups/daily-review/?date=${date}`)
    if (response.ok) setDailyReview(data)
  }

  const getLearningQuery = (date = selectedDate, month = selectedMonth, userId = learningUserId) => {
    const params = new URLSearchParams({ date, month })
    if (user?.role === 'Admin') params.set('user_id', userId || 'all')
    return params.toString()
  }

  const loadLearningDesk = async (date = selectedDate, month = selectedMonth, userId = learningUserId) => {
    const query = getLearningQuery(date, month, userId)
    const [entriesResult, reportResult] = await Promise.all([
      fetchJson(`${API_BASE}/learnings/?${query}`),
      fetchJson(`${API_BASE}/learnings/report/?${query}`),
    ])
    if (entriesResult.response.ok) setLearningEntries(entriesResult.data)
    if (reportResult.response.ok) setLearningReport(reportResult.data)
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
    const loaders = [loadTasks(date), loadUpcomingWork(date), loadSummary(date), loadDailyErrors(date), loadErrorSummary(date), loadMonthlyReport()]
    if (includeMessages) loaders.push(loadMessages(date), loadMembers(), loadProjects())
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
        const [tasksResult, upcomingResult, summaryResult, messagesResult, membersResult, projectsResult, reportResult, errorsResult, errorSummaryResult, reviewResult] = await Promise.all([
          fetchJson(`${API_BASE}/tasks/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/tasks/upcoming/?from=${selectedDate}&days=30`),
          fetchJson(`${API_BASE}/tasks/summary/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/messages/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/members/`),
          fetchJson(`${API_BASE}/projects/`),
          fetchJson(`${API_BASE}/tasks/monthly-report/?month=${selectedMonth}`),
          fetchJson(`${API_BASE}/errors/?date=${selectedDate}`),
          fetchJson(`${API_BASE}/errors/summary/?date=${selectedDate}`),
          data.role === 'Admin' ? fetchJson(`${API_BASE}/standups/daily-review/?date=${selectedDate}`) : Promise.resolve({ response: { ok: false }, data: null }),
        ])
        if (tasksResult.response.ok) setTasks(tasksResult.data)
        if (upcomingResult.response.ok) setUpcomingWork(upcomingResult.data)
        if (summaryResult.response.ok) setSummary(summaryResult.data)
        if (messagesResult.response.ok) setMessages(messagesResult.data)
        if (membersResult.response.ok) setMembers(membersResult.data)
        if (projectsResult.response.ok) setProjects(projectsResult.data)
        if (reportResult.response.ok) setMonthlyReport(reportResult.data)
        if (errorsResult.response.ok) setDailyErrors(errorsResult.data)
        if (errorSummaryResult.response.ok) setErrorSummary(errorSummaryResult.data)
        if (reviewResult.response.ok) setDailyReview(reviewResult.data)
      } else {
        setUser(null)
        setTasks([])
        setUpcomingWork([])
        setMessages([])
        setMembers([])
        setProjects([])
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
  const filteredUpcomingWork = useMemo(() => {
    const query = issueSearch.trim().toLowerCase()
    return upcomingWork.filter((task) => {
      const projectMatches = upcomingProjectFilter === 'all'
        || (upcomingProjectFilter === 'none' ? !task.project : String(task.project) === upcomingProjectFilter)
      const statusMatches = upcomingStatusFilter === 'all'
        || (upcomingStatusFilter === 'open' ? task.status !== 'Done' : task.status === upcomingStatusFilter)
      const assignmentMatches = upcomingAssignmentFilter === 'all'
        || (upcomingAssignmentFilter === 'unassigned' ? !task.assigned_to : Boolean(task.assigned_to))
      const searchMatches = !query
        || task.task.toLowerCase().includes(query)
        || (task.project_name || '').toLowerCase().includes(query)
        || (task.assigned_to_name || task.owner || '').toLowerCase().includes(query)
        || `tb-${task.id}`.includes(query)
      return projectMatches && statusMatches && assignmentMatches && searchMatches
    })
  }, [issueSearch, upcomingAssignmentFilter, upcomingProjectFilter, upcomingStatusFilter, upcomingWork])
  const upcomingNeedsAssignment = useMemo(() => upcomingWork.filter((task) => !task.assigned_to).length, [upcomingWork])
  const initials = (value = '') => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

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

  const workVisual = useMemo(() => {
    if (user?.role === 'Admin') {
      const bars = [
        { label: 'Submitted', value: dailyUpdateStats.submitted.length, tone: 'success' },
        { label: 'Absent', value: dailyUpdateStats.absent.length, tone: 'danger' },
        { label: 'Review', value: dailyUpdateStats.pending.length, tone: 'warning' },
        { label: 'Blockers', value: dailyUpdateStats.blockers.length, tone: 'danger' },
      ]
      const max = Math.max(...bars.map((bar) => bar.value), dailyUpdateStats.totalMembers, 1)
      return {
        title: 'Live work signal',
        subtitle: `${dailyUpdateStats.percent}% team updates submitted`,
        primary: dailyUpdateStats.percent,
        bars,
        max,
        focus: dailyUpdateStats.absent.length ? 'Follow up on missing updates' : dailyUpdateStats.pending.length ? 'Review pending updates' : 'Team is clear for today',
      }
    }

    const bars = statuses.map((status) => ({
      label: status,
      value: tasksByStatus[status]?.length || 0,
      tone: status === 'Done' ? 'success' : status === 'Blocked' ? 'danger' : status === 'In Progress' ? 'info' : 'neutral',
    }))
    const max = Math.max(...bars.map((bar) => bar.value), 1)
    const donePercent = visibleTasks.length ? Math.round(((tasksByStatus.Done?.length || 0) / visibleTasks.length) * 100) : 0
    return {
      title: taskScope === 'mine' ? 'My work flow' : 'Team work flow',
      subtitle: `${donePercent}% of visible work done`,
      primary: donePercent,
      bars,
      max,
      focus: visibleBlockedTasks.length ? 'Clear blockers first' : visibleTasks.length ? 'Keep current work moving' : 'No tasks assigned yet',
    }
  }, [dailyUpdateStats, taskScope, tasksByStatus, user?.role, visibleBlockedTasks.length, visibleTasks.length])

  const today = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${selectedDate}T00:00:00`))
  const formatWorkDate = (value) => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
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
  const renderLearningBars = (items = [], mode = 'entries') => {
    const maxValue = Math.max(...items.map((item) => item[mode] || 0), 1)
    return (
      <div className="learning-bars">
        {items.map((item) => {
          const value = item[mode] || 0
          return (
            <div className="learning-bar-row" key={item.label}>
              <span>{item.label}</span>
              <div>
                <i style={{ width: `${Math.max((value / maxValue) * 100, value ? 8 : 0)}%` }} />
              </div>
              <strong>{value}</strong>
            </div>
          )
        })}
      </div>
    )
  }

  const handleTaskChange = (event) => {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  const handleUpcomingEditChange = (event) => {
    const { name, value } = event.target
    setUpcomingEditForm((current) => ({ ...current, [name]: value }))
  }

  const handleDateChange = (event) => {
    const date = event.target.value
    setSelectedDate(date)
    setLearningForm((current) => ({ ...current, work_date: date }))
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

  const handleAdminMemberChange = (event) => {
    const { name, value } = event.target
    if (name === 'member_id') {
      const member = members.find((item) => String(item.id) === value)
      setAdminMemberForm({
        member_id: value,
        display_name: member?.display_name || '',
        username: member?.username || '',
        role: member?.role || 'Member',
        new_password: '',
      })
      return
    }

    setAdminMemberForm((current) => ({ ...current, [name]: value }))
  }

  const handleLearningChange = (event) => {
    const { name, value } = event.target
    setLearningForm((current) => ({ ...current, [name]: value }))
  }

  const handleLearningUserChange = async (event) => {
    const userId = event.target.value
    setLearningUserId(userId)
    await loadLearningDesk(selectedDate, selectedMonth, userId)
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

  const openLearningDesk = async () => {
    const defaultUserId = user?.role === 'Admin' ? 'all' : ''
    setLearningUserId(defaultUserId)
    setLearningForm((current) => ({ ...current, work_date: selectedDate }))
    setIsLearningDeskOpen(true)
    await loadLearningDesk(selectedDate, selectedMonth, defaultUserId)
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
      setLearningEntries([])
      setLearningReport(null)
      setDailyReview({ date: '', members: [] })
      setErrorSummary({ total: 0, open: 0, resolved: 0, critical: 0 })
      setIsErrorDeskOpen(false)
      setIsReviewDeskOpen(false)
      setIsPasswordModalOpen(false)
      setIsItRegisterOpen(false)
      setIsLearningDeskOpen(false)
      setPasswordForm(initialPasswordForm)
      setLearningForm(initialLearningForm)
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

  const handleAdminMemberSubmit = async (event) => {
    event.preventDefault()
    if (!adminMemberForm.member_id) return
    setLoading(true)
    setStatusMessage('')

    try {
      const payload = {
        display_name: adminMemberForm.display_name,
        role: adminMemberForm.role,
      }
      if (adminMemberForm.username.trim()) payload.new_username = adminMemberForm.username.trim()
      if (adminMemberForm.new_password) payload.new_password = adminMemberForm.new_password

      const { response, data } = await fetchJson(`${API_BASE}/members/${adminMemberForm.member_id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(data?.new_username?.[0] || data?.new_password?.[0] || data?.detail || 'Could not update member')

      setStatusMessage('Member account updated')
      setAdminMemberForm(initialAdminMemberForm)
      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLearningSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const payload = {
        ...learningForm,
        time_spent_minutes: Number(learningForm.time_spent_minutes || 0),
      }
      const { response, data } = await fetchJson(`${API_BASE}/learnings/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(data?.detail || 'Could not save learning')

      setLearningForm({ ...initialLearningForm, work_date: selectedDate })
      setStatusMessage('Learning saved')
      await loadLearningDesk(selectedDate, selectedMonth, learningUserId)
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
      if (!payload.project) delete payload.project

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

  const assignTask = async (taskId, assignedTo) => {
    setLoading(true)
    setStatusMessage('')

    try {
      const { response } = await fetchJson(`${API_BASE}/tasks/${taskId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: assignedTo || null }),
      })

      if (!response.ok) throw new Error('Unable to assign task')

      setStatusMessage('Task assigned')
      await refreshData(true)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const startUpcomingEdit = (task) => {
    setEditingUpcomingId(task.id)
    setUpcomingEditForm({
      task: task.task || '',
      owner: task.owner || displayName,
      assigned_to: task.assigned_to || '',
      project: task.project || '',
      status: task.status || 'Backlog',
      blocker: task.blocker || '',
      start_time: task.start_time ? task.start_time.slice(0, 5) : '',
      end_time: task.end_time ? task.end_time.slice(0, 5) : '',
      work_date: task.work_date || selectedDate,
    })
  }

  const cancelUpcomingEdit = () => {
    setEditingUpcomingId(null)
    setUpcomingEditForm(initialTaskForm)
  }

  const saveUpcomingEdit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatusMessage('')

    try {
      const payload = { ...upcomingEditForm }
      if (!payload.assigned_to) payload.assigned_to = null
      if (!payload.project) payload.project = null
      if (!payload.start_time) payload.start_time = null
      if (!payload.end_time) payload.end_time = null

      const { response } = await fetchJson(`${API_BASE}/tasks/${editingUpcomingId}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Unable to update upcoming work')

      setStatusMessage('Upcoming work updated')
      cancelUpcomingEdit()
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
              <span className="password-field">
                <input
                  name="password"
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authForm.password}
                  onChange={handleAuthChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowAuthPassword((isVisible) => !isVisible)}
                  aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showAuthPassword}
                >
                  {showAuthPassword ? 'Hide' : 'Show'}
                </button>
              </span>
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
      <aside className="work-sidebar" aria-label="Workspace navigation">
        <div className="sidebar-brand">
          <div className="brand-mark">TB</div>
          <div>
            <strong>Team Board</strong>
            <span>Work tracker</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className="active" onClick={() => document.getElementById('client-work')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Client work</span>
            <strong>{upcomingWork.length}</strong>
          </button>
          <button type="button" onClick={() => document.getElementById('today-updates')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Today updates</span>
            <strong>{dailyUpdateStats.submitted.length || visibleTasks.length}</strong>
          </button>
          <button type="button" onClick={() => document.getElementById('task-board')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Task board</span>
            <strong>{visibleTasks.length}</strong>
          </button>
          <button type="button" onClick={() => document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' })}>
            <span>Messages</span>
            <strong>{messages.length}</strong>
          </button>
        </nav>
        <div className="sidebar-focus">
          <span>Needs assignment</span>
          <strong>{upcomingNeedsAssignment}</strong>
        </div>
      </aside>

      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">{today}</p>
          <h1>Work management</h1>
          <p>Track client requests, assign owners, and move work through the team.</p>
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
                  Reviews {dailyUpdateStats.pending.length ? <span>{dailyUpdateStats.pending.length}</span> : null}
                </button>
              </>
            ) : null}
            <button className="error-desk-button" type="button" onClick={() => setIsErrorDeskOpen(true)}>
              Errors {openDailyErrors.length ? <span>{openDailyErrors.length}</span> : null}
            </button>
            <button className="learning-desk-button" type="button" onClick={openLearningDesk}>
              {user.role === 'Admin' ? 'Learning' : 'My learning'}
            </button>
            <button className="account-button" type="button" onClick={() => setIsPasswordModalOpen(true)}>Account</button>
            <button className="logout-button" type="button" onClick={handleLogout}>Logout</button>
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

      <section className="visual-work-panel panel" aria-label="Live work visualization">
        <div className="visual-copy">
          <p className="eyebrow">Visuals</p>
          <h2>{workVisual.title}</h2>
          <span>{workVisual.subtitle}</span>
        </div>
        <div className="visual-ring" style={{ '--visual-progress': `${workVisual.primary}%` }}>
          <strong>{workVisual.primary}%</strong>
          <span>signal</span>
        </div>
        <div className="visual-bars">
          {workVisual.bars.map((bar) => (
            <div className={`visual-bar-row tone-${bar.tone}`} key={bar.label}>
              <span>{bar.label}</span>
              <div>
                <i style={{ width: `${Math.max((bar.value / workVisual.max) * 100, bar.value ? 8 : 0)}%` }} />
              </div>
              <strong>{bar.value}</strong>
            </div>
          ))}
        </div>
        <div className="visual-reel" aria-hidden="true">
          {workVisual.bars.map((bar, index) => (
            <span className={`tone-${bar.tone}`} style={{ '--delay': `${index * 0.18}s` }} key={bar.label}></span>
          ))}
        </div>
        <div className="visual-focus">
          <span>Next best action</span>
          <strong>{workVisual.focus}</strong>
        </div>
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

      <section className="upcoming-work-panel panel" id="client-work" aria-label="Upcoming work">
        <div className="jira-project-bar">
          <div>
            <p>Projects / Team Board</p>
            <h2>Client requested work</h2>
          </div>
          <button type="button" className="jira-create-button" onClick={() => document.querySelector('.quick-add')?.scrollIntoView({ behavior: 'smooth' })}>
            Create
          </button>
        </div>

        <div className="jira-tabs" aria-label="Issue views">
          <button type="button" className="active">List</button>
          <button type="button">Board</button>
          <button type="button">Calendar</button>
          <button type="button">Reports</button>
        </div>

        <div className="jira-toolbar">
          <label className="jira-search">
            <span>Search</span>
            <input value={issueSearch} onChange={(event) => setIssueSearch(event.target.value)} placeholder="Search issues" />
          </label>
          <label>
            Project
            <select value={upcomingProjectFilter} onChange={(event) => setUpcomingProjectFilter(event.target.value)}>
              <option value="all">All projects</option>
              <option value="none">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={upcomingStatusFilter} onChange={(event) => setUpcomingStatusFilter(event.target.value)}>
              <option value="open">Open</option>
              <option value="all">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select value={upcomingAssignmentFilter} onChange={(event) => setUpcomingAssignmentFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </label>
          <div className="jira-result-count">
            <strong>{filteredUpcomingWork.length}</strong>
            <span>of {upcomingWork.length}</span>
          </div>
        </div>

        {filteredUpcomingWork.length ? (
          <div className="upcoming-table-head" aria-hidden="true">
            <span>Type</span>
            <span>Key</span>
            <span>Summary</span>
            <span>Status</span>
            <span>Assignee</span>
            <span>Due date</span>
            <span></span>
          </div>
        ) : null}

        <div className="upcoming-work-list">
          {filteredUpcomingWork.length ? filteredUpcomingWork.map((task) => (
            <article className={`upcoming-work-card ${task.blocked ? 'blocked' : ''}`} key={task.id}>
              {editingUpcomingId === task.id ? (
                <form className="upcoming-edit-form" onSubmit={saveUpcomingEdit}>
                  <label className="span-2">
                    Task
                    <input name="task" value={upcomingEditForm.task} onChange={handleUpcomingEditChange} required />
                  </label>
                  <label>
                    Project
                    <select name="project" value={upcomingEditForm.project} onChange={handleUpcomingEditChange}>
                      <option value="">No project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assign to
                    <select name="assigned_to" value={upcomingEditForm.assigned_to} onChange={handleUpcomingEditChange}>
                      <option value="">Unassigned</option>
                      {assignableMembers.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name || member.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date
                    <input name="work_date" type="date" value={upcomingEditForm.work_date || ''} onChange={handleUpcomingEditChange} required />
                  </label>
                  <label>
                    Status
                    <select name="status" value={upcomingEditForm.status} onChange={handleUpcomingEditChange}>
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label>
                    From
                    <input name="start_time" type="time" value={upcomingEditForm.start_time || ''} onChange={handleUpcomingEditChange} />
                  </label>
                  <label>
                    To
                    <input name="end_time" type="time" value={upcomingEditForm.end_time || ''} onChange={handleUpcomingEditChange} />
                  </label>
                  <label className="span-2">
                    Blocker / note
                    <textarea name="blocker" value={upcomingEditForm.blocker} onChange={handleUpcomingEditChange} rows="2" />
                  </label>
                  <div className="upcoming-edit-actions span-2">
                    <button type="button" onClick={cancelUpcomingEdit} disabled={loading}>Cancel</button>
                    <button className="primary-button" type="submit" disabled={loading}>Save</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="issue-type-cell">
                    <span className="issue-type-dot">T</span>
                  </div>
                  <div className="upcoming-work-key">
                    <strong>TB-{task.id}</strong>
                  </div>
                  <div className="upcoming-work-main">
                    <div className="task-card-top">
                      <strong>{task.task}</strong>
                    </div>
                    <p>{task.project_name || 'No project selected'}</p>
                    {task.blocker ? <div className="blocker-note">{task.blocker}</div> : null}
                  </div>
                  <div className="upcoming-work-project">
                    <span className={`jira-status ${statusClass(task.status)}`}>{task.status}</span>
                  </div>
                  <div className="upcoming-work-owner">
                    <div className={`assignee-pill ${!task.assigned_to ? 'unassigned' : ''}`}>
                      <span>{task.assigned_to ? initials(task.assigned_to_name) : 'UA'}</span>
                      <strong>{task.assigned_to ? task.assigned_to_name : 'Unassigned'}</strong>
                    </div>
                    {isLeader ? (
                      <>
                        <select
                          value={task.assigned_to || ''}
                          onChange={(event) => assignTask(task.id, event.target.value)}
                          disabled={loading}
                          aria-label={`Assign ${task.task}`}
                        >
                          <option value="">Assign member</option>
                          {assignableMembers.map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.display_name || member.username}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}
                  </div>
                  <div className="upcoming-work-date">
                    <strong>{formatWorkDate(task.work_date)}</strong>
                    <span>{task.start_time ? task.start_time.slice(0, 5) : 'Any time'}</span>
                  </div>
                  <div className="issue-actions">
                    {isLeader ? (
                      <button type="button" className="upcoming-edit-button" onClick={() => startUpcomingEdit(task)} aria-label={`Edit TB-${task.id}`}>
                        Edit
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </article>
          )) : (
            <p className="empty-state">No upcoming work matches these filters.</p>
          )}
        </div>
      </section>

      {user.role === 'Admin' ? (
        <section className="updates-dashboard-grid" id="today-updates" aria-label="Daily update dashboard">
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
              )) : <p className="empty-state">No updates for this date.</p>}
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
              }) : <p className="empty-state">All updates are in.</p>}
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
              }) : <p className="empty-state">No task movement yet.</p>}
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
                )) : <p className="empty-state">No monthly work yet.</p>}
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
                )) : <p className="empty-state">No project work yet.</p>}
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

          <label>
            Project
            <select name="project" value={taskForm.project} onChange={handleTaskChange}>
              <option value="">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
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
            )) : <p className="empty-state">No blockers.</p>}
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
              }) : <p className="empty-state">No members to review.</p>}
            </div>
          </section>
        </div>
      ) : null}

      {isLearningDeskOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="learning-modal panel" role="dialog" aria-modal="true" aria-label="Learning desk">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Learning desk</p>
                <h2>Daily learning</h2>
              </div>
              <div className="modal-actions">
                {user.role === 'Admin' ? (
                  <label className="learning-user-filter">
                    Member
                    <select value={learningUserId} onChange={handleLearningUserChange}>
                      <option value="all">All members</option>
                      {members.filter((member) => member.role === 'Member').map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name || member.username}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button type="button" className="close-button" onClick={() => setIsLearningDeskOpen(false)} aria-label="Close learning desk">
                  X
                </button>
              </div>
            </div>

            <div className="learning-summary-grid">
              <article><span>Today</span><strong>{learningReport?.today?.entries || 0}</strong><small>{learningReport?.today?.minutes || 0} min</small></article>
              <article><span>This week</span><strong>{learningReport?.week?.entries || 0}</strong><small>{learningReport?.week?.minutes || 0} min</small></article>
              <article><span>This month</span><strong>{learningReport?.month_summary?.entries || 0}</strong><small>{learningReport?.month_summary?.minutes || 0} min</small></article>
              <article><span>Categories</span><strong>{learningReport?.categories?.length || 0}</strong><small>tracked</small></article>
            </div>

            <div className="learning-layout">
              <form className="learning-form" onSubmit={handleLearningSubmit}>
                <div className="panel-heading span-2">
                  <div>
                    <p className="eyebrow">Add</p>
                    <h2>What did you learn?</h2>
                  </div>
                  {statusMessage ? <span className="inline-status">{statusMessage}</span> : null}
                </div>
                <label>
                  Date
                  <input name="work_date" type="date" value={learningForm.work_date} onChange={handleLearningChange} required />
                </label>
                <label>
                  Topic
                  <input name="topic" value={learningForm.topic} onChange={handleLearningChange} placeholder="React hooks, Docker logs, SQL indexes" required />
                </label>
                <label>
                  Category
                  <input name="category" value={learningForm.category} onChange={handleLearningChange} placeholder="Frontend, Backend, DevOps, AI" />
                </label>
                <label>
                  Time
                  <input name="time_spent_minutes" type="number" min="0" value={learningForm.time_spent_minutes} onChange={handleLearningChange} placeholder="Minutes" />
                </label>
                <label>
                  Confidence
                  <select name="confidence" value={learningForm.confidence} onChange={handleLearningChange}>
                    <option>Started</option>
                    <option>Practicing</option>
                    <option>Confident</option>
                  </select>
                </label>
                <label>
                  Source
                  <input name="source" value={learningForm.source} onChange={handleLearningChange} placeholder="Task, course, docs, issue" />
                </label>
                <label className="span-2">
                  Learning
                  <textarea name="summary" value={learningForm.summary} onChange={handleLearningChange} placeholder="Write the useful thing learned today" rows="3" required />
                </label>
                <label className="span-2">
                  Next step
                  <textarea name="next_step" value={learningForm.next_step} onChange={handleLearningChange} placeholder="What should you practice or apply next?" rows="2" />
                </label>
                <button className="primary-button span-2" type="submit" disabled={loading}>Save learning</button>
              </form>

              <section className="learning-insights">
                <div className="learning-chart-grid">
                  <article>
                    <div className="mini-heading">
                      <strong>Last 7 days</strong>
                      <span>Entries</span>
                    </div>
                    {renderLearningBars(learningReport?.week?.series || [])}
                  </article>
                  <article>
                    <div className="mini-heading">
                      <strong>Month weeks</strong>
                      <span>Minutes</span>
                    </div>
                    {renderLearningBars(learningReport?.month_summary?.weeks || [], 'minutes')}
                  </article>
                </div>

                <div className="learning-record-list">
                  {learningEntries.length ? learningEntries.map((entry) => (
                    <article className="learning-card" key={entry.id}>
                      <div>
                        <strong>{entry.topic}</strong>
                        <span>{entry.user_name} · {entry.work_date} · {entry.confidence}</span>
                      </div>
                      <p>{entry.summary}</p>
                      <div className="learning-tags">
                        {entry.category ? <span>{entry.category}</span> : null}
                        {entry.source ? <span>{entry.source}</span> : null}
                        <span>{entry.time_spent_minutes || 0} min</span>
                      </div>
                      {entry.next_step ? <small>Next: {entry.next_step}</small> : null}
                    </article>
                  )) : <p className="empty-state">No learning added yet.</p>}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {isPasswordModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className={`password-modal panel ${user.role === 'Admin' ? 'admin-account-modal' : ''}`} role="dialog" aria-modal="true" aria-label="Account settings">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Account settings</h2>
              </div>
              <button type="button" className="close-button" onClick={() => setIsPasswordModalOpen(false)} aria-label="Close password form">
                X
              </button>
            </div>

            <div className="account-settings-grid">
              <form className="password-form account-card" onSubmit={handlePasswordSubmit}>
                <div className="mini-heading">
                  <strong>My password</strong>
                  <span>Update your own login</span>
                </div>
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
                <button className="primary-button" type="submit" disabled={loading}>Update my password</button>
              </form>

              {user.role === 'Admin' ? (
                <form className="admin-member-form account-card" onSubmit={handleAdminMemberSubmit}>
                  <div className="mini-heading">
                    <strong>Admin member access</strong>
                    <span>Change username, display name, role, or reset password</span>
                  </div>
                  <label className="span-2">
                    Member
                    <select name="member_id" value={adminMemberForm.member_id} onChange={handleAdminMemberChange} required>
                      <option value="">Choose member</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.display_name || member.username} ({member.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Display name
                    <input name="display_name" value={adminMemberForm.display_name} onChange={handleAdminMemberChange} placeholder="Visible name" required />
                  </label>
                  <label>
                    Username
                    <input name="username" value={adminMemberForm.username} onChange={handleAdminMemberChange} placeholder="Login username" required />
                  </label>
                  <label>
                    Role
                    <select name="role" value={adminMemberForm.role} onChange={handleAdminMemberChange}>
                      <option>Admin</option>
                      <option>Manager</option>
                      <option>Member</option>
                    </select>
                  </label>
                  <label>
                    New password
                    <input name="new_password" type="password" value={adminMemberForm.new_password} onChange={handleAdminMemberChange} placeholder="Leave blank to keep current" autoComplete="new-password" />
                  </label>
                  <button className="primary-button span-2" type="submit" disabled={loading || !adminMemberForm.member_id}>Save member account</button>
                </form>
              ) : null}
            </div>

            {statusMessage ? <p className="form-message account-status">{statusMessage}</p> : null}
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
                  }) : <p className="empty-state">No records found.</p>}
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
                )) : <p className="empty-state">No errors logged.</p>}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {visibleTasks.length ? (
      <section className="board-grid" id="task-board" aria-label="Tasks by status">
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

              {!tasksByStatus[status]?.length ? <p className="empty-state">Empty</p> : null}
            </div>
          </section>
        ))}
      </section>
      ) : null}

      <section className="panel chat-panel" id="chat">
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
          )) : <p className="empty-state">No chat updates yet.</p>}
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
