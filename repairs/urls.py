from django.urls import path

from .views import (
    AnalyticsAPIView,
    ChartsAPIView,
    CsvExportAPIView,
    CsvImportAPIView,
    DashboardBootstrapAPIView,
    JobBulkUpdateAPIView,
    JobDetailAPIView,
    JobListCreateAPIView,
    JobPhaseUpdateAPIView,
    JobStatsAPIView,
    TablesAPIView,
    StatusHistoryUpdateAPIView,
)

urlpatterns = [
    path("bootstrap/", DashboardBootstrapAPIView.as_view(), name="dashboard-bootstrap"),
    path("jobs/", JobListCreateAPIView.as_view(), name="job-list"),
    path("jobs/<int:pk>/", JobDetailAPIView.as_view(), name="job-detail"),
    path("jobs/<int:pk>/bulk-update/", JobBulkUpdateAPIView.as_view(), name="job-bulk-update"),
    path("jobs/<int:pk>/phase/", JobPhaseUpdateAPIView.as_view(), name="job-phase"),
    path("jobs/stats/", JobStatsAPIView.as_view(), name="job-stats"),
    path("analytics/", AnalyticsAPIView.as_view(), name="analytics"),
    path("charts/", ChartsAPIView.as_view(), name="charts"),
    path("tables/", TablesAPIView.as_view(), name="tables"),
    path("import/csv/", CsvImportAPIView.as_view(), name="csv-import"),
    path("export/csv/", CsvExportAPIView.as_view(), name="csv-export"),
    path("status-history/<int:pk>/", StatusHistoryUpdateAPIView.as_view(), name="status-history"),
]
