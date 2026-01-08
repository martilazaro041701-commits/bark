from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import RepairJob, Status
from .serializers import RepairJobSerializer, StatusSerializer


class BarkHealthView(APIView):
    """
    Lightweight BARK-specific health/ping endpoint.
    """

    def get(self, request):
        return Response({"service": "bark", "status": "ok"})
    
class RepairJobViewSet(viewsets.ModelViewSet):
    queryset = RepairJob.objects.all().order_by('-created_at')
    serializer_class = RepairJobSerializer

    #Adding Filters
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority']
    search_fields = ['job_number', 'customer__first_name', 'vehicle__plate_number']

class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all().order_by('category', 'order')
    serializer_class = StatusSerializer


