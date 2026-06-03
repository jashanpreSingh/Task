from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Profile, Task


class UpcomingWorkTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin', password='password123')
        Profile.objects.create(user=self.admin, display_name='Admin User', role='Admin')
        self.client.force_authenticate(user=self.admin)

    def test_upcoming_includes_overdue_open_work(self):
        selected_date = date(2026, 6, 3)
        overdue = Task.objects.create(
            task='Overdue client request',
            owner='Client',
            work_date=selected_date - timedelta(days=7),
            status='Backlog',
        )
        upcoming = Task.objects.create(
            task='Upcoming client request',
            owner='Client',
            work_date=selected_date + timedelta(days=3),
            status='In Progress',
        )
        Task.objects.create(
            task='Completed client request',
            owner='Client',
            work_date=selected_date - timedelta(days=1),
            status='Done',
        )
        Task.objects.create(
            task='Later client request',
            owner='Client',
            work_date=selected_date + timedelta(days=45),
            status='Backlog',
        )

        response = self.client.get('/api/tasks/upcoming/', {'from': selected_date.isoformat(), 'days': 30})

        self.assertEqual(response.status_code, 200)
        ids = {task['id'] for task in response.json()}
        self.assertEqual(ids, {overdue.id, upcoming.id})
