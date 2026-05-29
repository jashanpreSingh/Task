from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
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


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if user_role(self.request.user) in LEADER_ROLES:
            return Task.objects.all()
        return Task.objects.filter(Q(assigned_to=self.request.user) | Q(owner__in=user_display_names(self.request.user))).distinct()

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
            return Standup.objects.select_related('user', 'project').all()
        return Standup.objects.select_related('user', 'project').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Message.objects.all().order_by('created_at')

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
