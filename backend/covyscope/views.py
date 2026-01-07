from rest_framework.response import Response
from rest_framework.views import APIView


class CovyHealthView(APIView):
    """
    Placeholder health endpoint for CovyScope tool.
    """

    def get(self, request):
        return Response({"service": "covyscope", "status": "ok"})
