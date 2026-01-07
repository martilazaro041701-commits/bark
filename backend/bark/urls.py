from django.urls import path
from bark import views

urlpatterns = [
    path("health/", views.BarkHealthView.as_view(), name="bark-health"),
]
