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
    content = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='All')
    work_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:40]}"


class Standup(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='standups')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, related_name='standups', blank=True, null=True)
    work_date = models.DateField(default=timezone.localdate)
    yesterday = models.TextField(blank=True, default='')
    today = models.TextField(blank=True, default='')
    blocker = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} standup {self.created_at:%Y-%m-%d}"
