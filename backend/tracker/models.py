from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Task(models.Model):
    STATUS_CHOICES = [
        ('Backlog', 'Backlog'),
        ('In Progress', 'In Progress'),
        ('Blocked', 'Blocked'),
        ('Done', 'Done'),
    ]

    task = models.CharField(max_length=255)
    owner = models.CharField(max_length=120)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='assigned_tasks', blank=True, null=True)
    project = models.ForeignKey('Project', on_delete=models.SET_NULL, related_name='tasks', blank=True, null=True)
    work_date = models.DateField(default=timezone.localdate)
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default='Backlog')
    blocker = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.task} ({self.owner})"


class Project(models.Model):
    name = models.CharField(max_length=160, unique=True)
    description = models.TextField(blank=True, default='')
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='owned_projects', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Profile(models.Model):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Manager', 'Manager'),
        ('Member', 'Member'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=120, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Member')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Message(models.Model):
    AUDIENCE_CHOICES = [
        ('All', 'All'),
        ('Admin', 'Admin'),
        ('Manager', 'Manager'),
        ('Member', 'Member'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages', blank=True, null=True)
    content = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='All')
    work_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:40]}"


class Standup(models.Model):
    REVIEW_STATUS_CHOICES = [
        ('Pending Review', 'Pending Review'),
        ('Reviewed', 'Reviewed'),
        ('Duplicate / Repeated', 'Duplicate / Repeated'),
        ('Needs Clarification', 'Needs Clarification'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='standups')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, related_name='standups', blank=True, null=True)
    work_date = models.DateField(default=timezone.localdate)
    yesterday = models.TextField(blank=True, default='')
    today = models.TextField(blank=True, default='')
    blocker = models.TextField(blank=True, default='')
    review_status = models.CharField(max_length=40, choices=REVIEW_STATUS_CHOICES, default='Pending Review')
    review_note = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='reviewed_standups', blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} standup {self.created_at:%Y-%m-%d}"


class DailyError(models.Model):
    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('Investigating', 'Investigating'),
        ('Resolved', 'Resolved'),
        ('Prevented', 'Prevented'),
    ]

    title = models.CharField(max_length=180)
    application = models.CharField(max_length=140)
    environment = models.CharField(max_length=80, blank=True, default='')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Medium')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='Open')
    occurrence_count = models.PositiveIntegerField(default=1)
    work_date = models.DateField(default=timezone.localdate)
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='reported_errors', blank=True, null=True)
    symptoms = models.TextField(blank=True, default='')
    root_cause = models.TextField(blank=True, default='')
    solution = models.TextField(blank=True, default='')
    prevention = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-created_at']

    def __str__(self):
        return f"{self.application}: {self.title}"


class ITProject(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Maintenance', 'Maintenance'),
        ('Paused', 'Paused'),
        ('Deprecated', 'Deprecated'),
    ]

    name = models.CharField(max_length=180, unique=True)
    project_type = models.CharField(max_length=80, blank=True, default='')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='Active')
    owner = models.CharField(max_length=120, blank=True, default='')
    developer = models.CharField(max_length=120, blank=True, default='')
    client = models.CharField(max_length=120, blank=True, default='')
    repo_url = models.CharField(max_length=240, blank=True, default='')
    live_url = models.CharField(max_length=240, blank=True, default='')
    staging_url = models.CharField(max_length=240, blank=True, default='')
    backend_url = models.CharField(max_length=240, blank=True, default='')
    tech_stack = models.TextField(blank=True, default='')
    server = models.CharField(max_length=160, blank=True, default='')
    database_name = models.CharField(max_length=160, blank=True, default='')
    credential_location = models.CharField(max_length=160, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    last_reviewed = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ITServer(models.Model):
    name = models.CharField(max_length=180, unique=True)
    provider = models.CharField(max_length=120, blank=True, default='')
    ip_address = models.CharField(max_length=80, blank=True, default='')
    environment = models.CharField(max_length=80, blank=True, default='Production')
    os = models.CharField(max_length=120, blank=True, default='')
    cpu = models.CharField(max_length=80, blank=True, default='')
    ram = models.CharField(max_length=80, blank=True, default='')
    disk = models.CharField(max_length=80, blank=True, default='')
    ssh_user = models.CharField(max_length=80, blank=True, default='')
    ssh_port = models.CharField(max_length=20, blank=True, default='')
    hosted_projects = models.TextField(blank=True, default='')
    backup_status = models.CharField(max_length=120, blank=True, default='')
    monitoring_status = models.CharField(max_length=120, blank=True, default='')
    credential_location = models.CharField(max_length=160, blank=True, default='')
    renewal_date = models.DateField(blank=True, null=True)
    owner = models.CharField(max_length=120, blank=True, default='')
    last_checked = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ITDomain(models.Model):
    domain_name = models.CharField(max_length=180, unique=True)
    registrar = models.CharField(max_length=120, blank=True, default='')
    expiry_date = models.DateField(blank=True, null=True)
    dns_provider = models.CharField(max_length=120, blank=True, default='')
    linked_project = models.CharField(max_length=180, blank=True, default='')
    points_to = models.CharField(max_length=180, blank=True, default='')
    ssl_provider = models.CharField(max_length=120, blank=True, default='')
    ssl_expiry_date = models.DateField(blank=True, null=True)
    renewal_owner = models.CharField(max_length=120, blank=True, default='')
    auto_renew = models.BooleanField(default=False)
    credential_location = models.CharField(max_length=160, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    last_reviewed = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['domain_name']

    def __str__(self):
        return self.domain_name


class ITAccount(models.Model):
    account = models.CharField(max_length=180)
    purpose = models.CharField(max_length=180, blank=True, default='')
    provider = models.CharField(max_length=120, blank=True, default='')
    used_by_project = models.CharField(max_length=180, blank=True, default='')
    owner = models.CharField(max_length=120, blank=True, default='')
    recovery_contact = models.CharField(max_length=180, blank=True, default='')
    mfa_enabled = models.BooleanField(default=False)
    credential_location = models.CharField(max_length=160, blank=True, default='')
    renewal_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    last_reviewed = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['account']

    def __str__(self):
        return self.account


class ITEmployee(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('On Leave', 'On Leave'),
        ('Inactive', 'Inactive'),
    ]

    name = models.CharField(max_length=160)
    position = models.CharField(max_length=120, blank=True, default='')
    department = models.CharField(max_length=120, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=40, blank=True, default='')
    manager = models.CharField(max_length=120, blank=True, default='')
    access_level = models.CharField(max_length=120, blank=True, default='')
    assigned_projects = models.TextField(blank=True, default='')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='Active')
    joining_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ITAISubscription(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Trial', 'Trial'),
        ('Paused', 'Paused'),
        ('Cancelled', 'Cancelled'),
    ]

    tool_name = models.CharField(max_length=160)
    provider = models.CharField(max_length=120, blank=True, default='')
    plan = models.CharField(max_length=120, blank=True, default='')
    account_email = models.EmailField(blank=True, default='')
    owner = models.CharField(max_length=120, blank=True, default='')
    assigned_users = models.TextField(blank=True, default='')
    monthly_cost = models.CharField(max_length=80, blank=True, default='')
    renewal_date = models.DateField(blank=True, null=True)
    billing_cycle = models.CharField(max_length=80, blank=True, default='')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='Active')
    credential_location = models.CharField(max_length=160, blank=True, default='')
    usage_notes = models.TextField(blank=True, default='')
    cancellation_notes = models.TextField(blank=True, default='')
    last_reviewed = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tool_name']

    def __str__(self):
        return self.tool_name


class ITRisk(models.Model):
    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
    ]

    title = models.CharField(max_length=180)
    category = models.CharField(max_length=80, blank=True, default='')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Medium')
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='Open')
    owner = models.CharField(max_length=120, blank=True, default='')
    due_date = models.DateField(blank=True, null=True)
    details = models.TextField(blank=True, default='')
    resolution = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['status', '-updated_at']

    def __str__(self):
        return self.title
