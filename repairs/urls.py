from django.urls import path

from .views import (
    AnalyticsAPIView,
    JobDetailAPIView,
    JobListCreateAPIView,
    JobPhaseUpdateAPIView,
    JobStatsAPIView,
    StatusHistoryUpdateAPIView,
)

urlpatterns = [
    path("jobs/", JobListCreateAPIView.as_view(), name="job-list"),
    path("jobs/<int:pk>/", JobDetailAPIView.as_view(), name="job-detail"),
    path("jobs/<int:pk>/phase/", JobPhaseUpdateAPIView.as_view(), name="job-phase"),
    path("jobs/stats/", JobStatsAPIView.as_view(), name="job-stats"),
    path("analytics/", AnalyticsAPIView.as_view(), name="analytics"),
    path("status-history/<int:pk>/", StatusHistoryUpdateAPIView.as_view(), name="status-history"),
]
