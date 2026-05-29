from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MessageViewSet,
    ProfileViewSet,
    ProjectViewSet,
    StandupViewSet,
    TaskViewSet,
    login_view,
    logout_view,
    register_view,
    session_view,
)

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'standups', StandupViewSet, basename='standup')
router.register(r'members', ProfileViewSet, basename='member')

urlpatterns = router.urls + [
    path('auth/session/', session_view, name='auth-session'),
    path('auth/register/', register_view, name='auth-register'),
    path('auth/login/', login_view, name='auth-login'),
    path('auth/logout/', logout_view, name='auth-logout'),
]
