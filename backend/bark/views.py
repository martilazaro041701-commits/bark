from rest_framework.response import Response
from rest_framework.views import APIView


class BarkHealthView(APIView):
    """
    Lightweight BARK-specific health/ping endpoint.
    """

    def get(self, request):
        return Response({"service": "bark", "status": "ok"})
