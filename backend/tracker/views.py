import calendar

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Message, Profile, Project, Standup, Task
from .serializers import MessageSerializer, ProfileSerializer, ProjectSerializer, StandupSerializer, TaskSerializer


LEADER_ROLES = {'Admin', 'Manager'}


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

    @action(detail=False, methods=['get'], url_path='monthly-report')
    def monthly_report(self, request):
        start, end = month_bounds(request.query_params.get('month'))
        if not start:
            return Response({'detail': 'Use month=YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

        tasks = self.get_queryset().filter(work_date__gte=start, work_date__lt=end)
        member_map = {}
        project_map = {}

        for task in tasks.select_related('project'):
            owner = task.owner or 'Unassigned'
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
        known_profiles = Profile.objects.select_related('user')
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

        working_days = working_days_in_month(start)
        for row in member_map.values():
            row['present_days'] = len(row['present_days'])
            row['absent_days'] = max(working_days - row['present_days'], 0)
            members.append(row)

        return Response({
            'month': request.query_params.get('month'),
            'working_days': working_days,
            'total': tasks.count(),
            'done': tasks.filter(status='Done').count(),
            'in_progress': tasks.filter(status='In Progress').count(),
            'blocked': tasks.filter(status='Blocked').count(),
            'members': sorted(members, key=lambda item: (-item['points'], item['owner'])),
            'projects': sorted(project_map.values(), key=lambda item: (-item['points'], item['project'])),
        }, status=status.HTTP_200_OK)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if user_role(self.request.user) in LEADER_ROLES:
            return Project.objects.all()
        return Project.objects.filter(Q(tasks__assigned_to=self.request.user) | Q(tasks__owner__in=user_display_names(self.request.user))).distinct()

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
        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


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
