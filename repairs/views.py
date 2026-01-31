from datetime import datetime, time, timedelta

from django.db import models
from django.db import transaction
from django.core.paginator import Paginator
from django.db.models import Avg, Count, ExpressionWrapper, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Customer, Job, JobPhase, StatusHistory, Vehicle
from .serializers import (
    JobCreateSerializer,
    JobDetailSerializer,
    JobSerializer,
    JobUpdateSerializer,
)


class JobListCreateAPIView(APIView):
    def get(self, request):
        jobs = (
            Job.objects.select_related("vehicle", "vehicle__customer")
            .order_by("-updated_at")
        )
        query = request.query_params.get("q")
        phase_prefix = request.query_params.get("phase_prefix")
        phase = request.query_params.get("phase")
        insurance = request.query_params.get("insurance")
        phase_in = request.query_params.get("phase_in")
        insurance_in = request.query_params.get("insurance_in")
        if query:
            jobs = jobs.filter(
                Q(vehicle__plate_number__icontains=query)
                | Q(vehicle__model__icontains=query)
                | Q(vehicle__customer__name__icontains=query)
                | Q(vehicle__insurance_company__icontains=query)
            )
        if phase_prefix and phase_prefix != "ALL":
            jobs = jobs.filter(phase__startswith=phase_prefix)
        if phase:
            jobs = jobs.filter(phase=phase)
        if phase_in:
            phases = [p for p in phase_in.split(",") if p]
            if phases:
                jobs = jobs.filter(phase__in=phases)
        if insurance:
            jobs = jobs.filter(vehicle__insurance_company__icontains=insurance)
        if insurance_in:
            ins = [i for i in insurance_in.split(",") if i]
            if ins:
                jobs = jobs.filter(vehicle__insurance_company__in=ins)

        page_number = int(request.query_params.get("page", 1))
        paginator = Paginator(jobs, 50)
        page_obj = paginator.get_page(page_number)
        return Response(
            {
                "results": JobSerializer(page_obj.object_list, many=True).data,
                "page": page_obj.number,
                "num_pages": paginator.num_pages,
                "count": paginator.count,
            }
        )

    def post(self, request):
        serializer = JobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            customer_id = serializer.validated_data.get("customer_id")
            vehicle_id = serializer.validated_data.get("vehicle_id")
            customer_data = serializer.validated_data.get("customer") or {}
            vehicle_data = serializer.validated_data.get("vehicle") or {}

            if vehicle_id:
                vehicle = Vehicle.objects.get(pk=vehicle_id)
            else:
                if customer_id:
                    customer = Customer.objects.get(pk=customer_id)
                else:
                    customer, _ = Customer.objects.get_or_create(
                        name=customer_data.get("name", "Unnamed Customer"),
                        defaults={
                            "phone": customer_data.get("phone", ""),
                            "email": customer_data.get("email", ""),
                            "address": customer_data.get("address", ""),
                        },
                    )
                vehicle, created_vehicle = Vehicle.objects.get_or_create(
                    plate_number=vehicle_data["plate_number"],
                    defaults={
                        "customer": customer,
                        "model": vehicle_data["model"],
                        "insurance_company": vehicle_data["insurance_company"],
                    },
                )
                if not created_vehicle:
                    # If the same plate is reused for a different customer, update linkage.
                    if vehicle.customer_id != customer.id:
                        vehicle.customer = customer
                    # Keep vehicle details in sync with latest intake.
                    vehicle.model = vehicle_data.get("model", vehicle.model)
                    vehicle.insurance_company = vehicle_data.get(
                        "insurance_company", vehicle.insurance_company
                    )
                    vehicle.save()

            job = Job.objects.create(
                vehicle=vehicle,
                description=serializer.validated_data.get("description", ""),
                total_estimate=serializer.validated_data.get("total_estimate", 0),
                approved_loa_amount=serializer.validated_data.get("approved_loa_amount", 0),
                parts_price=serializer.validated_data.get("parts_price", 0),
                labor_cost=serializer.validated_data.get("labor_cost", 0),
                vat=serializer.validated_data.get("vat", 0),
                total_cost=serializer.validated_data.get("total_cost", 0),
                phase=serializer.validated_data.get("phase", JobPhase.APPROVAL_ESTIMATE_DONE),
            )
        return Response(JobSerializer(job).data, status=status.HTTP_201_CREATED)


class JobDetailAPIView(APIView):
    def get(self, request, pk):
        job = get_object_or_404(
            Job.objects.select_related("vehicle", "vehicle__customer"),
            pk=pk,
        )
        return Response(JobDetailSerializer(job, context={"request": request}).data)

    def patch(self, request, pk):
        job = get_object_or_404(
            Job.objects.select_related("vehicle", "vehicle__customer"),
            pk=pk,
        )
        serializer = JobUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(job, serializer.validated_data)
        return Response(JobDetailSerializer(job, context={"request": request}).data)


class JobPhaseUpdateAPIView(APIView):
    def patch(self, request, pk):
        job = get_object_or_404(
            Job.objects.select_related("vehicle", "vehicle__customer"),
            pk=pk,
        )
        phase = request.data.get("phase")
        valid_phases = {choice[0] for choice in JobPhase.choices}
        if phase not in valid_phases:
            return Response({"detail": "Invalid phase."}, status=status.HTTP_400_BAD_REQUEST)
        job.change_phase(phase, user=request.user if request.user.is_authenticated else None)
        return Response(JobSerializer(job).data)


class StatusHistoryUpdateAPIView(APIView):
    def patch(self, request, pk):
        entry = get_object_or_404(StatusHistory, pk=pk)
        if not request.user.is_authenticated or not request.user.is_superuser:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        timestamp = request.data.get("timestamp")
        if not timestamp:
            return Response({"detail": "timestamp is required."}, status=status.HTTP_400_BAD_REQUEST)

        new_ts = parse_datetime(timestamp)
        if new_ts is None:
            return Response({"detail": "Invalid timestamp."}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(new_ts):
            new_ts = timezone.make_aware(new_ts, timezone.get_current_timezone())
        if new_ts == entry.timestamp:
            return Response({"id": entry.id, "timestamp": entry.timestamp})

        history = list(
            StatusHistory.objects.filter(job=entry.job).order_by("timestamp")
        )
        idx = history.index(entry)
        prev_entry = history[idx - 1] if idx > 0 else None
        next_entry = history[idx + 1] if idx < len(history) - 1 else None

        local_new = timezone.localtime(new_ts)
        new_date = local_new.date()
        if prev_entry:
            prev_local = timezone.localtime(prev_entry.timestamp)
            if new_date < prev_local.date():
                return Response(
                    {"detail": "Timestamp cannot be before previous phase."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if next_entry:
            next_local = timezone.localtime(next_entry.timestamp)
            if new_date > next_local.date():
                return Response(
                    {"detail": "Timestamp cannot be after next phase."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        entry.timestamp = new_ts
        entry.save(update_fields=["timestamp"])
        return Response(
            {
                "id": entry.id,
                "timestamp": entry.timestamp,
            }
        )


class JobStatsAPIView(APIView):
    def get(self, request):
        now = timezone.now()
        week_start = now - timedelta(days=7)

        active = Job.objects.count()
        released = Job.objects.filter(
            phase__in=[JobPhase.PICKUP_RELEASED, JobPhase.BILLING_RELEASED],
            updated_at__gte=week_start,
        ).count()

        avg_cycle = (
            StatusHistory.objects.filter(old_phase=JobPhase.REPAIR_ONGOING_BODY_PAINT)
            .aggregate(avg=Avg("duration"))
            .get("avg")
        )
        avg_cycle_str = "--"
        if avg_cycle:
            avg_days = avg_cycle.total_seconds() / 86400
            avg_cycle_str = f"{avg_days:.1f} days"

        alerts = Job.objects.filter(phase=JobPhase.APPROVAL_LOA_REJECTED).count()
        revenue = (
            Job.objects.aggregate(total=models.Sum("total_cost")).get("total") or 0
        )
        revenue_ratio = min(float(revenue) / 1000000, 1.0) if revenue else 0

        trend_labels = []
        trend_values = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            count = Job.objects.filter(updated_at__date=day).count()
            trend_labels.append(day.strftime("%b %d"))
            trend_values.append(count)

        return Response(
            {
                "active": active,
                "avgCycle": avg_cycle_str,
                "alerts": alerts,
                "throughput": released,
                "revenue": float(revenue),
                "revenueRatio": revenue_ratio,
                "trendLabels": trend_labels,
                "trendValues": trend_values,
            }
        )


class AnalyticsAPIView(APIView):
    def get(self, request):
        range_param = request.query_params.get("range", "30d")
        tz = timezone.get_current_timezone()
        today = timezone.localdate()
        if range_param == "today":
            start_date = today
            end_date = today
        elif range_param == "7d":
            # Monday-Sunday week
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
        else:
            # Calendar month
            start_date = today.replace(day=1)
            next_month = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            end_date = next_month - timedelta(days=1)

        start_dt = timezone.make_aware(datetime.combine(start_date, time.min), tz)
        end_dt = timezone.make_aware(datetime.combine(end_date, time.max), tz)

        # Line chart is based on Estimate Done phase timestamp
        trend = (
            StatusHistory.objects.filter(
                new_phase=JobPhase.APPROVAL_ESTIMATE_DONE,
                timestamp__range=(start_dt, end_dt),
            )
            .annotate(day=TruncDate("timestamp", tzinfo=tz))
            .values("day")
            .annotate(total=Count("job", distinct=True))
            .order_by("day")
        )
        trend_map = {t["day"]: t["total"] for t in trend}
        trend_labels = []
        trend_values = []
        current = start_date
        while current <= end_date:
            trend_labels.append(current.strftime("%b %d"))
            trend_values.append(trend_map.get(current, 0))
            current += timedelta(days=1)

        pending_parts = (
            Job.objects.filter(phase__startswith="PARTS", updated_at__range=(start_dt, end_dt))
            .values("vehicle__customer")
            .distinct()
            .count()
        )
        pending_loa = (
            Job.objects.filter(phase__startswith="APPROVAL", updated_at__range=(start_dt, end_dt))
            .values("vehicle__customer")
            .distinct()
            .count()
        )
        in_repair = (
            Job.objects.filter(phase__startswith="REPAIR", updated_at__range=(start_dt, end_dt))
            .values("vehicle__customer")
            .distinct()
            .count()
        )

        billing_pending_total = (
            Job.objects.filter(phase=JobPhase.BILLING_PENDING, updated_at__range=(start_dt, end_dt))
            .aggregate(total=Sum("total_cost"))
            .get("total")
            or 0
        )

        def phase_ts(phase_value):
            return Subquery(
                StatusHistory.objects.filter(job=OuterRef("pk"), new_phase=phase_value)
                .order_by("timestamp")
                .values("timestamp")[:1]
            )

        base = Job.objects.all()
        loa_processing = phase_ts(JobPhase.APPROVAL_LOA_PROCESSING)
        loa_approved = phase_ts(JobPhase.APPROVAL_LOA_APPROVED)
        parts_ordered = phase_ts(JobPhase.PARTS_ORDERED)
        parts_arrived = phase_ts(JobPhase.PARTS_ARRIVED)
        repair_ongoing = phase_ts(JobPhase.REPAIR_ONGOING_REPAIR)
        inspection = phase_ts(JobPhase.REPAIR_INSPECTION_TESTING)
        billing_pending = phase_ts(JobPhase.BILLING_PENDING)
        billing_paid = phase_ts(JobPhase.BILLING_PAID)

        def avg_duration(start_field, end_field):
            qs = (
                base.annotate(start=start_field, end=end_field)
                .exclude(start__isnull=True, end__isnull=True)
                .filter(start__range=(start_dt, end_dt), end__range=(start_dt, end_dt))
                .filter(end__gte=F("start"))
            )
            return qs.aggregate(
                avg=Avg(ExpressionWrapper(F("end") - F("start"), output_field=models.DurationField()))
            ).get("avg")

        analytics = {
            "trendLabels": trend_labels,
            "trendValues": trend_values,
            "pendingParts": pending_parts,
            "pendingLoa": pending_loa,
            "inRepair": in_repair,
            "billingPendingTotal": float(billing_pending_total),
            "cycleTimes": {
                "loaEfficiency": avg_duration(loa_processing, loa_approved),
                "logisticsFlow": avg_duration(parts_ordered, parts_arrived),
                "partsToRepair": avg_duration(parts_arrived, repair_ongoing),
                "productionSpeed": avg_duration(repair_ongoing, inspection),
                "billingVelocity": avg_duration(billing_pending, billing_paid),
            },
        }
        return Response(analytics)

# Create your views here.
