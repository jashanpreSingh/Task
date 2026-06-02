import calendar
from datetime import timedelta

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import DailyError, ITAISubscription, ITAccount, ITDomain, ITEmployee, ITProject, ITRisk, ITServer, LearningEntry, Message, Profile, Project, Standup, Task
from .serializers import (
    DailyErrorSerializer,
    ITAISubscriptionSerializer,
    ITAccountSerializer,
    ITDomainSerializer,
    ITEmployeeSerializer,
    ITProjectSerializer,
    ITRiskSerializer,
    ITServerSerializer,
    LearningEntrySerializer,
    MessageSerializer,
    ProfileSerializer,
    ProjectSerializer,
    StandupSerializer,
    TaskSerializer,
)


LEADER_ROLES = {'Admin', 'Manager'}


def is_admin_user(user):
    return user.is_authenticated and user_role(user) == 'Admin'


def user_profile(user):
    try:
        return user.profile
    except Profile.DoesNotExist:
        return None


def user_role(user):
    profile = user_profile(user)
    return profile.role if profile else 'Member'


def user_display_names(user):
    profile = user_profile(user)
    names = {user.username}
    if profile and profile.display_name:
        names.add(profile.display_name)
    return names


def filter_by_date(queryset, request):
    work_date = request.query_params.get('date')
    if work_date:
        return queryset.filter(work_date=work_date)
    return queryset


def task_points(task):
    points = {
        'Backlog': 0,
        'In Progress': 4,
        'Blocked': 1,
        'Done': 10,
    }.get(task.status, 0)
    if task.status == 'Done' and task.start_time and task.end_time:
        start_minutes = task.start_time.hour * 60 + task.start_time.minute
        end_minutes = task.end_time.hour * 60 + task.end_time.minute
        duration = end_minutes - start_minutes
        if 0 <= duration <= 240:
            points += 5
        elif 0 <= duration <= 480:
            points += 3
    return points


def month_bounds(month_value):
    if not month_value:
        return None, None
    start = parse_date(f'{month_value}-01')
    if not start:
        return None, None
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1)
    else:
        end = start.replace(month=start.month + 1, day=1)
    return start, end


def working_days_in_month(start):
    _, days = calendar.monthrange(start.year, start.month)
    return sum(1 for day in range(1, days + 1) if start.replace(day=day).weekday() != 6)


def display_name_for_user(user):
    profile = user_profile(user)
    return profile.display_name if profile and profile.display_name else user.username


def sync_task_projects_from_it_projects():
    for it_project in ITProject.objects.all():
        Project.objects.get_or_create(
            name=it_project.name,
            defaults={
                'description': it_project.notes or it_project.tech_stack or '',
                'is_active': it_project.status != 'Deprecated',
            },
        )


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if user_role(self.request.user) in LEADER_ROLES:
            return filter_by_date(Task.objects.all(), self.request)
        queryset = Task.objects.filter(Q(assigned_to=self.request.user) | Q(owner__in=user_display_names(self.request.user))).distinct()
        return filter_by_date(queryset, self.request)

    def perform_create(self, serializer):
        if user_role(self.request.user) in LEADER_ROLES:
            assigned_to = serializer.validated_data.get('assigned_to')
            if assigned_to:
                profile = user_profile(assigned_to)
                owner = profile.display_name if profile and profile.display_name else assigned_to.username
                serializer.save(owner=owner)
            else:
                serializer.save()
            return

        profile = user_profile(self.request.user)
        display_name = profile.display_name if profile and profile.display_name else self.request.user.username
        serializer.save(owner=display_name, assigned_to=self.request.user)

    def perform_update(self, serializer):
        if user_role(self.request.user) in LEADER_ROLES:
            serializer.save()
            return

        serializer.save(
            owner=serializer.instance.owner,
            assigned_to=serializer.instance.assigned_to,
            project=serializer.instance.project,
        )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        tasks = self.get_queryset()
        completed = tasks.filter(status='Done').count()
        pending_blockers = tasks.filter(status='Blocked').count()
        in_progress = tasks.filter(status='In Progress').count()
        return Response({
            'completed': completed,
            'pending_blockers': pending_blockers,
            'in_progress': in_progress,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        selected_date = parse_date(request.query_params.get('from') or timezone.localdate().isoformat()) or timezone.localdate()
        try:
            days = int(request.query_params.get('days', 14))
        except (TypeError, ValueError):
            days = 14
        days = min(max(days, 1), 90)
        end_date = selected_date + timedelta(days=days)
        tasks = Task.objects.select_related('assigned_to', 'assigned_to__profile', 'project').filter(
            work_date__gte=selected_date,
            work_date__lte=end_date,
        ).exclude(status='Done').order_by('work_date', 'start_time', 'updated_at')
        return Response(TaskSerializer(tasks[:30], many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='monthly-report')
    def monthly_report(self, request):
        start, end = month_bounds(request.query_params.get('month'))
        if not start:
            return Response({'detail': 'Use month=YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        tasks = self.get_queryset().filter(work_date__gte=start, work_date__lt=end)
        member_profiles = Profile.objects.select_related('user').filter(role='Member')
        member_names = {
            profile.display_name or profile.user.username
            for profile in member_profiles
        }
        member_map = {}
        project_map = {}

        for task in tasks.select_related('project'):
            owner = task.owner or 'Unassigned'
            if user_role(request.user) in LEADER_ROLES and owner not in member_names:
                continue
            if owner not in member_map:
                member_map[owner] = {
                    'owner': owner,
                    'total': 0,
                    'done': 0,
                    'in_progress': 0,
                    'blocked': 0,
                    'points': 0,
                    'present_days': set(),
                }
            member_map[owner]['total'] += 1
            member_map[owner]['points'] += task_points(task)
            member_map[owner]['present_days'].add(task.work_date.isoformat())
            if task.status == 'Done':
                member_map[owner]['done'] += 1
            if task.status == 'In Progress':
                member_map[owner]['in_progress'] += 1
            if task.status == 'Blocked':
                member_map[owner]['blocked'] += 1

            project = task.project.name if task.project else 'No Project'
            if project not in project_map:
                project_map[project] = {'project': project, 'total': 0, 'done': 0, 'points': 0}
            project_map[project]['total'] += 1
            project_map[project]['points'] += task_points(task)
            if task.status == 'Done':
                project_map[project]['done'] += 1

        members = []
        known_profiles = member_profiles
        if user_role(request.user) not in LEADER_ROLES:
            known_profiles = known_profiles.filter(user=request.user)

        for profile in known_profiles:
            owner = profile.display_name or profile.user.username
            if owner not in member_map:
                member_map[owner] = {
                    'owner': owner,
                    'total': 0,
                    'done': 0,
                    'in_progress': 0,
                    'blocked': 0,
                    'points': 0,
                    'present_days': set(),
                }

        standups = Standup.objects.select_related('user', 'user__profile').filter(
            work_date__gte=start,
            work_date__lt=end,
            user__profile__role='Member',
        )
        if user_role(request.user) not in LEADER_ROLES:
            standups = standups.filter(user=request.user)

        for standup in standups:
            profile = user_profile(standup.user)
            owner = profile.display_name if profile and profile.display_name else standup.user.username
            if owner not in member_map:
                member_map[owner] = {
                    'owner': owner,
                    'total': 0,
                    'done': 0,
                    'in_progress': 0,
                    'blocked': 0,
                    'points': 0,
                    'present_days': set(),
                }
            member_map[owner]['present_days'].add(standup.work_date.isoformat())

        working_days = working_days_in_month(start)
        for row in member_map.values():
            row['present_days'] = len(row['present_days'])
            row['absent_days'] = max(working_days - row['present_days'], 0)
            members.append(row)

        task_total = sum(row['total'] for row in members)
        task_done = sum(row['done'] for row in members)
        task_in_progress = sum(row['in_progress'] for row in members)
        task_blocked = sum(row['blocked'] for row in members)

        return Response({
            'month': request.query_params.get('month'),
            'working_days': working_days,
            'total': task_total,
            'done': task_done,
            'in_progress': task_in_progress,
            'blocked': task_blocked,
            'members': sorted(members, key=lambda item: (-item['points'], item['owner'])),
            'projects': sorted(project_map.values(), key=lambda item: (-item['points'], item['project'])),
        }, status=status.HTTP_200_OK)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        sync_task_projects_from_it_projects()
        return Project.objects.all()

    def create(self, request, *args, **kwargs):
        if user_role(request.user) not in LEADER_ROLES:
            return Response({'detail': 'Only admins and managers can create projects'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if user_role(request.user) not in LEADER_ROLES:
            return Response({'detail': 'Only admins and managers can update projects'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if user_role(request.user) not in LEADER_ROLES:
            return Response({'detail': 'Only admins and managers can delete projects'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        if user_role(self.request.user) in LEADER_ROLES:
            return Profile.objects.select_related('user').all().order_by('display_name', 'user__username')
        return Profile.objects.filter(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        if user_role(request.user) != 'Admin':
            return Response({'detail': 'Only admins can change member access'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)


class StandupViewSet(viewsets.ModelViewSet):
    queryset = Standup.objects.select_related('user', 'project').all()
    serializer_class = StandupSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if user_role(self.request.user) in LEADER_ROLES:
            queryset = Standup.objects.select_related('user', 'project').all()
        else:
            queryset = Standup.objects.select_related('user', 'project').filter(user=self.request.user)
        work_date = self.request.query_params.get('date')
        if work_date:
            queryset = queryset.filter(work_date=work_date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='daily-review')
    def daily_review(self, request):
        if user_role(request.user) != 'Admin':
            return Response({'detail': 'Only admins can review daily updates'}, status=status.HTTP_403_FORBIDDEN)

        work_date = request.query_params.get('date') or timezone.localdate().isoformat()
        standups = {
            standup.user_id: standup
            for standup in Standup.objects.select_related('user', 'user__profile').filter(work_date=work_date)
        }
        rows = []

        for profile in Profile.objects.select_related('user').filter(role='Member').order_by('display_name', 'user__username'):
            standup = standups.get(profile.user_id)
            rows.append({
                'user_id': profile.user_id,
                'username': profile.user.username,
                'user_name': profile.display_name or profile.user.username,
                'role': profile.role,
                'attendance': 'Present' if standup else 'Absent',
                'standup': StandupSerializer(standup).data if standup else None,
            })

        return Response({'date': work_date, 'members': rows}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='review')
    def review(self, request, pk=None):
        if user_role(request.user) != 'Admin':
            return Response({'detail': 'Only admins can review daily updates'}, status=status.HTTP_403_FORBIDDEN)

        standup = self.get_object()
        review_status = request.data.get('review_status', 'Reviewed')
        review_note = request.data.get('review_note', '').strip()
        send_feedback = request.data.get('send_feedback', False)

        valid_statuses = {choice[0] for choice in Standup.REVIEW_STATUS_CHOICES}
        if review_status not in valid_statuses:
            return Response({'detail': 'Invalid review status'}, status=status.HTTP_400_BAD_REQUEST)

        standup.review_status = review_status
        standup.review_note = review_note
        standup.reviewed_by = request.user
        standup.reviewed_at = timezone.now()
        standup.save(update_fields=['review_status', 'review_note', 'reviewed_by', 'reviewed_at'])

        if send_feedback and review_status in {'Duplicate / Repeated', 'Needs Clarification'}:
            content = review_note or {
                'Duplicate / Repeated': 'Your daily update looks repeated. Please update it with today\'s actual work.',
                'Needs Clarification': 'Please review your daily update and add clearer details.',
            }.get(review_status, 'Please review your daily update.')
            Message.objects.create(
                sender=request.user,
                recipient=standup.user,
                audience='Member',
                content=content,
                work_date=standup.work_date,
            )

        return Response(StandupSerializer(standup).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='send-reminder')
    def send_reminder(self, request):
        if user_role(request.user) != 'Admin':
            return Response({'detail': 'Only admins can send reminders'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        work_date = request.data.get('work_date') or timezone.localdate().isoformat()
        note = request.data.get('review_note', '').strip() or 'Please submit your daily update for today.'

        try:
            recipient = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)

        Message.objects.create(
            sender=request.user,
            recipient=recipient,
            audience='Member',
            content=note,
            work_date=work_date,
        )
        return Response({'detail': 'Reminder sent'}, status=status.HTTP_200_OK)


class DailyErrorViewSet(viewsets.ModelViewSet):
    queryset = DailyError.objects.select_related('reported_by').all()
    serializer_class = DailyErrorSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DailyError.objects.select_related('reported_by').all()
        if user_role(self.request.user) not in LEADER_ROLES:
            queryset = queryset.filter(reported_by=self.request.user)
        return filter_by_date(queryset, self.request)

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        errors = self.get_queryset()
        return Response({
            'total': errors.count(),
            'open': errors.exclude(status__in=['Resolved', 'Prevented']).count(),
            'resolved': errors.filter(status__in=['Resolved', 'Prevented']).count(),
            'critical': errors.filter(severity='Critical').count(),
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-seen')
    def mark_seen(self, request, pk=None):
        daily_error = self.get_object()
        daily_error.occurrence_count = F('occurrence_count') + 1
        daily_error.status = 'Open'
        daily_error.save(update_fields=['occurrence_count', 'status', 'updated_at'])
        daily_error.refresh_from_db()
        return Response(self.get_serializer(daily_error).data, status=status.HTTP_200_OK)


class LearningEntryViewSet(viewsets.ModelViewSet):
    queryset = LearningEntry.objects.select_related('user', 'user__profile').all()
    serializer_class = LearningEntrySerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = LearningEntry.objects.select_related('user', 'user__profile').all()
        if user_role(self.request.user) not in LEADER_ROLES:
            queryset = queryset.filter(user=self.request.user)
        else:
            user_id = self.request.query_params.get('user_id')
            if user_id and user_id != 'all':
                queryset = queryset.filter(user_id=user_id)

        work_date = self.request.query_params.get('date')
        month = self.request.query_params.get('month')
        if work_date:
            queryset = queryset.filter(work_date=work_date)
        elif month:
            start, end = month_bounds(month)
            if start:
                queryset = queryset.filter(work_date__gte=start, work_date__lt=end)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if user_role(self.request.user) in LEADER_ROLES or serializer.instance.user_id == self.request.user.id:
            serializer.save(user=serializer.instance.user)
            return
        self.permission_denied(self.request, message='You can update only your own learning')

    def destroy(self, request, *args, **kwargs):
        entry = self.get_object()
        if user_role(request.user) not in LEADER_ROLES and entry.user_id != request.user.id:
            return Response({'detail': 'You can delete only your own learning'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def report(self, request):
        selected_date = parse_date(request.query_params.get('date') or timezone.localdate().isoformat()) or timezone.localdate()
        month = request.query_params.get('month') or selected_date.strftime('%Y-%m')
        month_start, month_end = month_bounds(month)
        if not month_start:
            return Response({'detail': 'Use month=YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        base_queryset = LearningEntry.objects.select_related('user', 'user__profile')
        selected_user_id = request.query_params.get('user_id', '')
        if user_role(request.user) not in LEADER_ROLES:
            base_queryset = base_queryset.filter(user=request.user)
            selected_user_id = str(request.user.id)
        elif selected_user_id and selected_user_id != 'all':
            base_queryset = base_queryset.filter(user_id=selected_user_id)

        week_start = selected_date - timedelta(days=6)
        week_entries = base_queryset.filter(work_date__gte=week_start, work_date__lte=selected_date)
        month_entries = base_queryset.filter(work_date__gte=month_start, work_date__lt=month_end)
        today_entries = base_queryset.filter(work_date=selected_date)

        def empty_bucket(label):
            return {'label': label, 'entries': 0, 'minutes': 0}

        daily_series = [
            empty_bucket((week_start + timedelta(days=index)).strftime('%d %b'))
            for index in range(7)
        ]
        daily_index = {
            (week_start + timedelta(days=index)).isoformat(): index
            for index in range(7)
        }
        for entry in week_entries:
            bucket_index = daily_index.get(entry.work_date.isoformat())
            if bucket_index is None:
                continue
            daily_series[bucket_index]['entries'] += 1
            daily_series[bucket_index]['minutes'] += entry.time_spent_minutes

        _, days_in_month = calendar.monthrange(month_start.year, month_start.month)
        week_series = [empty_bucket(f'Week {index}') for index in range(1, 6)]
        month_series = [
            empty_bucket(month_start.replace(day=day).strftime('%d'))
            for day in range(1, days_in_month + 1)
        ]
        member_map = {}
        category_map = {}

        for entry in month_entries:
            week_number = min(((entry.work_date.day - 1) // 7), 4)
            week_series[week_number]['entries'] += 1
            week_series[week_number]['minutes'] += entry.time_spent_minutes

            day_bucket = entry.work_date.day - 1
            month_series[day_bucket]['entries'] += 1
            month_series[day_bucket]['minutes'] += entry.time_spent_minutes

            member_name = display_name_for_user(entry.user)
            if member_name not in member_map:
                member_map[member_name] = {'user_id': entry.user_id, 'name': member_name, 'entries': 0, 'minutes': 0}
            member_map[member_name]['entries'] += 1
            member_map[member_name]['minutes'] += entry.time_spent_minutes

            category = entry.category or 'General'
            if category not in category_map:
                category_map[category] = {'category': category, 'entries': 0, 'minutes': 0}
            category_map[category]['entries'] += 1
            category_map[category]['minutes'] += entry.time_spent_minutes

        return Response({
            'date': selected_date.isoformat(),
            'month': month,
            'selected_user_id': selected_user_id or 'all',
            'today': {
                'entries': today_entries.count(),
                'minutes': sum(entry.time_spent_minutes for entry in today_entries),
            },
            'week': {
                'entries': week_entries.count(),
                'minutes': sum(entry.time_spent_minutes for entry in week_entries),
                'series': daily_series,
            },
            'month_summary': {
                'entries': month_entries.count(),
                'minutes': sum(entry.time_spent_minutes for entry in month_entries),
                'series': month_series,
                'weeks': week_series,
            },
            'members': sorted(member_map.values(), key=lambda item: (-item['entries'], item['name'])),
            'categories': sorted(category_map.values(), key=lambda item: (-item['entries'], item['category'])),
        }, status=status.HTTP_200_OK)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Message.objects.all()
        work_date = self.request.query_params.get('date')
        if work_date:
            queryset = queryset.filter(work_date=work_date)
        queryset = queryset.filter(Q(recipient__isnull=True) | Q(recipient=self.request.user) | Q(sender=self.request.user))
        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class AdminOnlyITViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not is_admin_user(request.user):
            self.permission_denied(request, message='Only admins can access IT Register')


class ITProjectViewSet(AdminOnlyITViewSet):
    queryset = ITProject.objects.all()
    serializer_class = ITProjectSerializer


class ITServerViewSet(AdminOnlyITViewSet):
    queryset = ITServer.objects.all()
    serializer_class = ITServerSerializer


class ITDomainViewSet(AdminOnlyITViewSet):
    queryset = ITDomain.objects.all()
    serializer_class = ITDomainSerializer


class ITAccountViewSet(AdminOnlyITViewSet):
    queryset = ITAccount.objects.all()
    serializer_class = ITAccountSerializer


class ITEmployeeViewSet(AdminOnlyITViewSet):
    queryset = ITEmployee.objects.all()
    serializer_class = ITEmployeeSerializer


class ITAISubscriptionViewSet(AdminOnlyITViewSet):
    queryset = ITAISubscription.objects.all()
    serializer_class = ITAISubscriptionSerializer


class ITRiskViewSet(AdminOnlyITViewSet):
    queryset = ITRisk.objects.all()
    serializer_class = ITRiskSerializer


def date_soon(value, days=30):
    if not value:
        return False
    today = timezone.localdate()
    return today <= value <= today + timedelta(days=days)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def it_register_summary(request):
    if not is_admin_user(request.user):
        return Response({'detail': 'Only admins can access IT Register'}, status=status.HTTP_403_FORBIDDEN)

    projects = ITProject.objects.all()
    servers = ITServer.objects.all()
    domains = ITDomain.objects.all()
    accounts = ITAccount.objects.all()
    employees = ITEmployee.objects.all()
    ai_subscriptions = ITAISubscription.objects.all()
    risks = ITRisk.objects.all()

    missing = []
    for project in projects:
        for field, label in [('owner', 'owner'), ('server', 'server'), ('credential_location', 'credential location')]:
            if not getattr(project, field):
                missing.append(f'Project {project.name} missing {label}')
    for server in servers:
        for field, label in [('ip_address', 'IP'), ('backup_status', 'backup status'), ('credential_location', 'credential location')]:
            if not getattr(server, field):
                missing.append(f'Server {server.name} missing {label}')
    for domain in domains:
        for field, label in [('registrar', 'registrar'), ('expiry_date', 'expiry date'), ('renewal_owner', 'renewal owner')]:
            if not getattr(domain, field):
                missing.append(f'Domain {domain.domain_name} missing {label}')
    for account in accounts:
        for field, label in [('owner', 'owner'), ('credential_location', 'credential location')]:
            if not getattr(account, field):
                missing.append(f'Account {account.account} missing {label}')
    for employee in employees:
        for field, label in [('position', 'position'), ('department', 'department')]:
            if not getattr(employee, field):
                missing.append(f'Employee {employee.name} missing {label}')
    for subscription in ai_subscriptions:
        for field, label in [('owner', 'owner'), ('account_email', 'account email'), ('credential_location', 'credential location')]:
            if not getattr(subscription, field):
                missing.append(f'AI subscription {subscription.tool_name} missing {label}')

    expiring_domains = [
        {'name': domain.domain_name, 'date': domain.expiry_date}
        for domain in domains
        if date_soon(domain.expiry_date)
    ]
    expiring_ssl = [
        {'name': domain.domain_name, 'date': domain.ssl_expiry_date}
        for domain in domains
        if date_soon(domain.ssl_expiry_date)
    ]
    expiring_servers = [
        {'name': server.name, 'date': server.renewal_date}
        for server in servers
        if date_soon(server.renewal_date)
    ]
    expiring_ai = [
        {'name': subscription.tool_name, 'date': subscription.renewal_date}
        for subscription in ai_subscriptions
        if date_soon(subscription.renewal_date)
    ]

    return Response({
        'projects': projects.count(),
        'servers': servers.count(),
        'domains': domains.count(),
        'accounts': accounts.count(),
        'employees': employees.count(),
        'ai_subscriptions': ai_subscriptions.count(),
        'open_risks': risks.exclude(status='Resolved').count(),
        'critical_risks': risks.filter(severity='Critical').exclude(status='Resolved').count(),
        'missing_count': len(missing),
        'missing': missing[:12],
        'expiring_domains': expiring_domains,
        'expiring_ssl': expiring_ssl,
        'expiring_servers': expiring_servers,
        'expiring_ai': expiring_ai,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def session_view(request):
    if request.user.is_authenticated:
        profile = None
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            profile = None

        return Response({
            'authenticated': True,
            'username': request.user.username,
            'display_name': profile.display_name if profile else request.user.username,
            'role': profile.role if profile else 'Member',
        })
    return Response({'authenticated': False})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    display_name = request.data.get('display_name', '').strip() or username
    role = 'Member'

    if not username or not password:
        return Response({'detail': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = User.objects.create_user(username=username, password=password)
        Profile.objects.create(user=user, display_name=display_name, role=role)

    login(request, user)
    return Response({
        'authenticated': True,
        'username': user.username,
        'display_name': display_name,
        'role': role,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)
    profile = None
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        profile = None

    return Response({
        'authenticated': True,
        'username': user.username,
        'display_name': profile.display_name if profile else user.username,
        'role': profile.role if profile else 'Member',
    })


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'authenticated': False})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not current_password or not new_password or not confirm_password:
        return Response({'detail': 'All password fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'detail': 'New passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.check_password(current_password):
        return Response({'detail': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    login(request, request.user)
    return Response({'detail': 'Password changed'}, status=status.HTTP_200_OK)
