from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DailyErrorViewSet,
    ITAISubscriptionViewSet,
    ITAccountViewSet,
    ITDomainViewSet,
    ITEmployeeViewSet,
    ITProjectViewSet,
    ITRiskViewSet,
    ITServerViewSet,
    MessageViewSet,
    ProfileViewSet,
    ProjectViewSet,
    StandupViewSet,
    TaskViewSet,
    change_password_view,
    it_register_summary,
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
router.register(r'errors', DailyErrorViewSet, basename='error')
router.register(r'members', ProfileViewSet, basename='member')
router.register(r'it/projects', ITProjectViewSet, basename='it-project')
router.register(r'it/servers', ITServerViewSet, basename='it-server')
router.register(r'it/domains', ITDomainViewSet, basename='it-domain')
router.register(r'it/accounts', ITAccountViewSet, basename='it-account')
router.register(r'it/employees', ITEmployeeViewSet, basename='it-employee')
router.register(r'it/ai-subscriptions', ITAISubscriptionViewSet, basename='it-ai-subscription')
router.register(r'it/risks', ITRiskViewSet, basename='it-risk')

urlpatterns = router.urls + [
    path('it/summary/', it_register_summary, name='it-summary'),
    path('auth/session/', session_view, name='auth-session'),
    path('auth/register/', register_view, name='auth-register'),
    path('auth/login/', login_view, name='auth-login'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('auth/change-password/', change_password_view, name='auth-change-password'),
]
