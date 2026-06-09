from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/structure', views.api_structure, name='api_structure'),
    path('api/records', views.api_records, name='api_records'),
    path('api/records/clear', views.api_records_clear, name='api_records_clear'),
    path('api/records/<str:pass_no>', views.api_record_detail, name='api_record_detail'),
]
