from django.urls import path
from covyscope.views import CovyHealthView

urlpatterns = [
    path("health/", CovyHealthView.as_view(), name="covyscope-health"),
]
