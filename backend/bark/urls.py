from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StatusViewSet, RepairJobViewSet 

# 1. Create a router and register viewsets
router = DefaultRouter()
router.register(r'statuses', StatusViewSet)
router.register(r'jobs', RepairJobViewSet)

# 2. The API URLs 
urlpatterns = [
    path('', include(router.urls)),
]