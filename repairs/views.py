from datetime import datetime, time, timedelta
import csv
import logging
import time as _time

from django.db import models
from django.db import transaction
from django.core.paginator import Paginator
from django.db.models import (
    Avg,
    Case,
    CharField,
    Count,
    ExpressionWrapper,
    F,
    OuterRef,
    Q,
    Prefetch,
    Subquery,
    Sum,
    Value,
    When,
)
from django.db.models.functions import Coalesce, TruncDate
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Customer, Job, JobPhase, StatusHistory, Vehicle
from .serializers import (
    JobCreateSerializer,
    JobDetailSerializer,
    JobSerializer,
    JobUpdateSerializer,
    StatusHistorySerializer,
)

logger = logging.getLogger(__name__)
LIST_PAGE_SIZE = 20


def _log_timing(name, request, start):
    elapsed = _time.monotonic() - start
    logger.info("timing %s %s %.3fs", name, request.path, elapsed)


def _cached_response(payload, *, s_maxage=10, stale_revalidate=30):
    response = Response(payload)
    cache_value = f"public, s-maxage={s_maxage}, stale-while-revalidate={stale_revalidate}"
    response["Cache-Control"] = cache_value
    response["CDN-Cache-Control"] = cache_value
    response["Vercel-CDN-Cache-Control"] = cache_value
    vary_header = response.get("Vary", "")
    vary_values = [v.strip() for v in vary_header.split(",") if v.strip()]
    vary_values = [v for v in vary_values if v.lower() != "cookie"]
    if vary_values:
        response["Vary"] = ", ".join(vary_values)
    elif "Vary" in response:
        del response["Vary"]
    return response


def _parse_date_range(request, default_days=30):
    tz = timezone.get_current_timezone()
    today = timezone.localdate()
    start_str = request.query_params.get("start_date")
    end_str = request.query_params.get("end_date")
    if start_str and end_str:
        try:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
        except ValueError:
            return None, None, None, None, Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400
            )
        if end_date < start_date:
            return None, None, None, None, Response(
                {"detail": "end_date must be on or after start_date."}, status=400
            )
    else:
        end_date = today
        start_date = today - timedelta(days=max(default_days - 1, 0))

    start_dt = timezone.make_aware(datetime.combine(start_date, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end_date, time.max), tz)
    return start_date, end_date, start_dt, end_dt, None


def _duration_seconds(duration):
    if not duration:
        return None
    return duration.total_seconds()


def _daily_series(qs, start_date, end_date, tz):
    series = (
        qs.annotate(day=TruncDate("timestamp", tzinfo=tz))
        .values("day")
        .annotate(total=Count("job", distinct=True))
        .order_by("day")
    )
    series_map = {row["day"]: row["total"] for row in series}
    labels = []
    values = []
    current = start_date
    while current <= end_date:
        labels.append(current.strftime("%b %d"))
        values.append(series_map.get(current, 0))
        current += timedelta(days=1)
    return labels, values


def _normalize_model_name(raw_value):
    if raw_value is None:
        return "Unknown"
    cleaned = " ".join(str(raw_value).split()).strip()
    if not cleaned:
        return "Unknown"
    lowered = cleaned.lower().replace(" ", "")
    if lowered == "xforce":
        return "Xforce"
    if lowered == "xpander":
        return "Xpander"
    # Keep Mirage vs Mirage G4 distinct by not collapsing tokens.
    return cleaned.title()


class JobListCreateAPIView(APIView):
    authentication_classes = []

    def get(self, request):
        _start = _time.monotonic()
        try:
            latest_status_ts = Subquery(
                StatusHistory.objects.filter(job=OuterRef("pk"))
                .order_by("-timestamp")
                .values("timestamp")[:1]
            )
            first_status_ts = Subquery(
                StatusHistory.objects.filter(job=OuterRef("pk"))
                .order_by("timestamp")
                .values("timestamp")[:1]
            )
            billing_released_ts = Subquery(
                StatusHistory.objects.filter(
                    job=OuterRef("pk"), new_phase=JobPhase.BILLING_RELEASED
                )
                .order_by("-timestamp")
                .values("timestamp")[:1]
            )
            jobs = (
                Job.objects.select_related("vehicle", "vehicle__customer")
                .annotate(
                    latest_status_ts=latest_status_ts,
                    first_status_ts=first_status_ts,
                    billing_released_ts=billing_released_ts,
                )
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
            paginator = Paginator(jobs, LIST_PAGE_SIZE)
            page_obj = paginator.get_page(page_number)
            return _cached_response(
                {
                    "results": JobSerializer(page_obj.object_list, many=True).data,
                    "page": page_obj.number,
                    "num_pages": paginator.num_pages,
                    "count": paginator.count,
                },
                s_maxage=20,
                stale_revalidate=60,
            )
        finally:
            _log_timing("JobListCreateAPIView.get", request, _start)

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
    authentication_classes = []

    def get(self, request, pk):
        _start = _time.monotonic()
        try:
            job = get_object_or_404(
                Job.objects.select_related("vehicle", "vehicle__customer").prefetch_related(
                    Prefetch(
                        "status_history",
                        queryset=StatusHistory.objects.only(
                            "id", "job_id", "old_phase", "new_phase", "timestamp", "duration"
                        ).order_by("-timestamp"),
                        to_attr="prefetched_history",
                    )
                ),
                pk=pk,
            )
            return _cached_response(
                JobDetailSerializer(job, context={"request": request}).data,
                s_maxage=20,
                stale_revalidate=60,
            )
        finally:
            _log_timing("JobDetailAPIView.get", request, _start)

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


class JobBulkUpdateAPIView(APIView):
    def patch(self, request, pk):
        mode = (request.query_params.get("mode") or "fast").lower()
        job = get_object_or_404(
            Job.objects.select_related("vehicle", "vehicle__customer"),
            pk=pk,
        )
        phase_changed = False

        with transaction.atomic():
            serializer = JobUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.update(job, serializer.validated_data)

            phase = request.data.get("phase")
            if phase:
                valid_phases = {choice[0] for choice in JobPhase.choices}
                if phase not in valid_phases:
                    return Response({"detail": "Invalid phase."}, status=status.HTTP_400_BAD_REQUEST)
                if phase != job.phase:
                    job.change_phase(
                        phase,
                        user=request.user if request.user.is_authenticated else None,
                    )
                    phase_changed = True

            history_updates = request.data.get("history_updates") or []
            if history_updates:
                if not request.user.is_authenticated or not request.user.is_superuser:
                    return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

                history_map = {
                    entry.id: entry
                    for entry in StatusHistory.objects.filter(job=job).order_by("timestamp")
                }
                ordered_history = list(history_map.values())

                for update in history_updates:
                    entry_id = update.get("id")
                    timestamp = update.get("timestamp")
                    entry = history_map.get(entry_id)
                    if not entry or not timestamp:
                        return Response(
                            {"detail": "Invalid history update payload."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    new_ts = parse_datetime(timestamp)
                    if new_ts is None:
                        return Response({"detail": "Invalid timestamp."}, status=status.HTTP_400_BAD_REQUEST)
                    if timezone.is_naive(new_ts):
                        new_ts = timezone.make_aware(new_ts, timezone.get_current_timezone())
                    if new_ts == entry.timestamp:
                        continue

                    idx = ordered_history.index(entry)
                    prev_entry = ordered_history[idx - 1] if idx > 0 else None
                    next_entry = ordered_history[idx + 1] if idx < len(ordered_history) - 1 else None

                    local_new = timezone.localtime(new_ts).date()
                    if prev_entry and local_new < timezone.localtime(prev_entry.timestamp).date():
                        return Response(
                            {"detail": "Timestamp cannot be before previous phase."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    if next_entry and local_new > timezone.localtime(next_entry.timestamp).date():
                        return Response(
                            {"detail": "Timestamp cannot be after next phase."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    entry.timestamp = new_ts
                    entry.save(update_fields=["timestamp"])

        if mode == "full":
            refreshed_job = get_object_or_404(
                Job.objects.select_related("vehicle", "vehicle__customer").prefetch_related(
                    Prefetch(
                        "status_history",
                        queryset=StatusHistory.objects.only(
                            "id", "job_id", "old_phase", "new_phase", "timestamp", "duration"
                        ).order_by("-timestamp"),
                        to_attr="prefetched_history",
                    )
                ),
                pk=pk,
            )
            return Response(
                {
                    "detail": JobDetailSerializer(refreshed_job, context={"request": request}).data,
                    "list_item": JobSerializer(refreshed_job).data,
                }
            )

        return Response(
            {
                "ok": True,
                "job": {
                    "id": job.id,
                    "phase": job.phase,
                    "updated_at": job.updated_at,
                },
                "phase_changed": phase_changed,
                "history_entry": (
                    StatusHistorySerializer(
                        StatusHistory.objects.filter(job=job).order_by("-timestamp").first()
                    ).data
                    if phase_changed
                    else None
                ),
            }
        )


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


@ensure_csrf_cookie
def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({"ok": True})
            return redirect("dashboard")

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({"ok": False, "error": "Invalid username or password."}, status=401)
        return render(request, "login.html", {"error": "Invalid username or password."})

    return render(request, "login.html")


def logout_view(request):
    logout(request)
    return redirect("login")


class JobStatsAPIView(APIView):
    authentication_classes = []

    def get(self, request):
        _start = _time.monotonic()
        try:
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

            return _cached_response(
                {
                    "active": active,
                    "avgCycle": avg_cycle_str,
                    "alerts": alerts,
                    "throughput": released,
                    "revenue": float(revenue),
                    "revenueRatio": revenue_ratio,
                    "trendLabels": trend_labels,
                    "trendValues": trend_values,
                },
                s_maxage=20,
                stale_revalidate=60,
            )
        finally:
            _log_timing("JobStatsAPIView.get", request, _start)


class AnalyticsAPIView(APIView):
    authentication_classes = []

    def get(self, request):
        _start = _time.monotonic()
        try:
            range_param = request.query_params.get("range", "30d")
            custom_start = request.query_params.get("start_date")
            custom_end = request.query_params.get("end_date")
            tz = timezone.get_current_timezone()
            today = timezone.localdate()
            if range_param == "custom" and custom_start and custom_end:
                try:
                    start_date = datetime.strptime(custom_start, "%Y-%m-%d").date()
                    end_date = datetime.strptime(custom_end, "%Y-%m-%d").date()
                except ValueError:
                    return Response({"detail": "Invalid custom date format."}, status=400)
                if end_date < start_date:
                    return Response({"detail": "end_date must be on or after start_date."}, status=400)
            elif range_param == "today":
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
                Job.objects.filter(phase__startswith="PARTS")
                .values("id")
                .distinct()
                .count()
            )
            pending_loa = (
                Job.objects.filter(phase__startswith="APPROVAL")
                .values("id")
                .distinct()
                .count()
            )
            in_repair = (
                Job.objects.filter(phase__startswith="REPAIR")
                .values("id")
                .distinct()
                .count()
            )

            billing_pending_qs = Job.objects.filter(phase=JobPhase.BILLING_PENDING)
            billing_pending_total = (
                billing_pending_qs.aggregate(total=Sum("approved_loa_amount")).get("total") or 0
            )

            def avg_duration_by_phase(start_phase, end_phase):
                start_sub = Subquery(
                    StatusHistory.objects.filter(job=OuterRef("job_id"), new_phase=start_phase)
                    .order_by("timestamp")
                    .values("timestamp")[:1]
                )
                end_sub = Subquery(
                    StatusHistory.objects.filter(job=OuterRef("job_id"), new_phase=end_phase)
                    .order_by("timestamp")
                    .values("timestamp")[:1]
                )
                qs = (
                    StatusHistory.objects.filter(
                        new_phase=end_phase, timestamp__range=(start_dt, end_dt)
                    )
                    .annotate(start_ts=start_sub, end_ts=end_sub)
                    .exclude(start_ts__isnull=True, end_ts__isnull=True)
                    .filter(end_ts__gte=F("start_ts"))
                )
                return qs.aggregate(
                    avg=Avg(
                        ExpressionWrapper(F("end_ts") - F("start_ts"), output_field=models.DurationField())
                    )
                ).get("avg")

            cycle_times = {
                "loaEfficiency": None,
                "logisticsFlow": None,
                "partsToRepair": None,
                "productionSpeed": None,
                "billingVelocity": None,
            }
            try:
                cycle_times = {
                    "loaEfficiency": avg_duration_by_phase(
                        JobPhase.APPROVAL_LOA_PROCESSING, JobPhase.APPROVAL_LOA_APPROVED
                    ),
                    "logisticsFlow": avg_duration_by_phase(
                        JobPhase.PARTS_ORDERED, JobPhase.PARTS_ARRIVED
                    ),
                    "partsToRepair": avg_duration_by_phase(
                        JobPhase.PARTS_ARRIVED, JobPhase.REPAIR_ONGOING_REPAIR
                    ),
                    "productionSpeed": avg_duration_by_phase(
                        JobPhase.REPAIR_ONGOING_REPAIR, JobPhase.REPAIR_INSPECTION_TESTING
                    ),
                    "billingVelocity": avg_duration_by_phase(
                        JobPhase.BILLING_PENDING, JobPhase.BILLING_PAID
                    ),
                }
            except Exception:
                cycle_times = cycle_times

            analytics = {
                "trendLabels": trend_labels,
                "trendValues": trend_values,
                "pendingParts": pending_parts,
                "pendingLoa": pending_loa,
                "inRepair": in_repair,
                "billingPendingTotal": float(billing_pending_total),
                "cycleTimes": cycle_times,
            }
            return _cached_response(analytics, s_maxage=20, stale_revalidate=60)
        finally:
            _log_timing("AnalyticsAPIView.get", request, _start)


class DashboardBootstrapAPIView(APIView):
    authentication_classes = []

    def get(self, request):
        _start = _time.monotonic()
        try:
            latest_status_ts = Subquery(
                StatusHistory.objects.filter(job=OuterRef("pk"))
                .order_by("-timestamp")
                .values("timestamp")[:1]
            )
            first_status_ts = Subquery(
                StatusHistory.objects.filter(job=OuterRef("pk"))
                .order_by("timestamp")
                .values("timestamp")[:1]
            )
            billing_released_ts = Subquery(
                StatusHistory.objects.filter(
                    job=OuterRef("pk"), new_phase=JobPhase.BILLING_RELEASED
                )
                .order_by("-timestamp")
                .values("timestamp")[:1]
            )
            jobs_qs = (
                Job.objects.select_related("vehicle", "vehicle__customer")
                .annotate(
                    latest_status_ts=latest_status_ts,
                    first_status_ts=first_status_ts,
                    billing_released_ts=billing_released_ts,
                )
                .order_by("-updated_at")
            )
            paginator = Paginator(jobs_qs, LIST_PAGE_SIZE)
            page_obj = paginator.get_page(1)
            jobs_payload = {
                "results": JobSerializer(page_obj.object_list, many=True).data,
                "page": page_obj.number,
                "num_pages": paginator.num_pages,
                "count": paginator.count,
            }

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
            revenue = Job.objects.aggregate(total=models.Sum("total_cost")).get("total") or 0
            revenue_ratio = min(float(revenue) / 1000000, 1.0) if revenue else 0
            trend_labels = []
            trend_values = []
            for i in range(6, -1, -1):
                day = (now - timedelta(days=i)).date()
                count = Job.objects.filter(updated_at__date=day).count()
                trend_labels.append(day.strftime("%b %d"))
                trend_values.append(count)
            stats_payload = {
                "active": active,
                "avgCycle": avg_cycle_str,
                "alerts": alerts,
                "throughput": released,
                "revenue": float(revenue),
                "revenueRatio": revenue_ratio,
                "trendLabels": trend_labels,
                "trendValues": trend_values,
            }

            return _cached_response(
                {"jobs": jobs_payload, "stats": stats_payload},
                s_maxage=20,
                stale_revalidate=60,
            )
        finally:
            _log_timing("DashboardBootstrapAPIView.get", request, _start)


class ChartsAPIView(APIView):
    authentication_classes = []

    def get(self, request):
        _start = _time.monotonic()
        try:
            start_date, end_date, start_dt, end_dt, error = _parse_date_range(
                request, default_days=30
            )
            if error:
                return error
            tz = timezone.get_current_timezone()

            repairs_in_qs = StatusHistory.objects.filter(
                new_phase=JobPhase.REPAIR_ONGOING_REPAIR,
                timestamp__range=(start_dt, end_dt),
            )
            repairs_out_qs = StatusHistory.objects.filter(
                new_phase__in=[JobPhase.PICKUP_RELEASED, JobPhase.BILLING_RELEASED],
                timestamp__range=(start_dt, end_dt),
            )
            estimates_qs = StatusHistory.objects.filter(
                new_phase=JobPhase.APPROVAL_ESTIMATE_DONE,
                timestamp__range=(start_dt, end_dt),
            )

            repairs_in_labels, repairs_in_values = _daily_series(
                repairs_in_qs, start_date, end_date, tz
            )
            repairs_out_labels, repairs_out_values = _daily_series(
                repairs_out_qs, start_date, end_date, tz
            )
            estimates_labels, estimates_values = _daily_series(
                estimates_qs, start_date, end_date, tz
            )

            insurance_distribution = (
                Job.objects.filter(created_at__range=(start_dt, end_dt))
                .values("vehicle__insurance_company")
                .annotate(total=Count("id"))
                .order_by("-total")
            )
            insurance_data = [
                {"label": row["vehicle__insurance_company"] or "Unknown", "value": row["total"]}
                for row in insurance_distribution
            ]

            model_rows = (
                Job.objects.filter(created_at__range=(start_dt, end_dt))
                .values("vehicle__model")
                .annotate(total=Count("id"))
                .order_by("-total")
            )
            model_counts = {}
            for row in model_rows:
                normalized = _normalize_model_name(row["vehicle__model"])
                model_counts[normalized] = model_counts.get(normalized, 0) + row["total"]
            model_data = [
                {"label": key, "value": value}
                for key, value in sorted(model_counts.items(), key=lambda x: x[1], reverse=True)
            ]

            billing_pending_qs = Job.objects.filter(phase=JobPhase.BILLING_PENDING)
            billing_pending_total = (
                billing_pending_qs.aggregate(total=Sum("approved_loa_amount")).get("total") or 0
            )

            loa_approved_jobs = StatusHistory.objects.filter(
                new_phase=JobPhase.APPROVAL_LOA_APPROVED,
                timestamp__range=(start_dt, end_dt),
            ).values_list("job_id", flat=True)
            loa_approved_qs = Job.objects.filter(id__in=loa_approved_jobs)
            loa_approved_total = (
                loa_approved_qs.aggregate(total=Sum("approved_loa_amount")).get("total") or 0
            )

            phase_counts = {}
            for row in Job.objects.values("phase").annotate(total=Count("id")):
                prefix = (row["phase"] or "UNKNOWN").split("_")[0]
                phase_counts[prefix] = phase_counts.get(prefix, 0) + row["total"]
            phase_concentration = [
                {"label": key.title(), "value": value}
                for key, value in sorted(phase_counts.items(), key=lambda x: x[1], reverse=True)
            ]

            return _cached_response(
                {
                    "range": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                    },
                    "repairsIn": {"labels": repairs_in_labels, "values": repairs_in_values},
                    "repairsOut": {"labels": repairs_out_labels, "values": repairs_out_values},
                    "estimatesMade": {"labels": estimates_labels, "values": estimates_values},
                    "insuranceDistribution": insurance_data,
                    "carModelDistribution": model_data,
                    "pendingBilled": {
                        "count": billing_pending_qs.count(),
                        "total": float(billing_pending_total),
                    },
                    "approvedLoa": {
                        "count": loa_approved_qs.count(),
                        "total": float(loa_approved_total),
                    },
                    "phaseConcentration": phase_concentration,
                },
                s_maxage=60,
                stale_revalidate=180,
            )
        finally:
            _log_timing("ChartsAPIView.get", request, _start)


class TablesAPIView(APIView):
    authentication_classes = []

    def get(self, request):
        _start = _time.monotonic()
        try:
            start_date, end_date, start_dt, end_dt, error = _parse_date_range(
                request, default_days=30
            )
            if error:
                return error

            phase_cycle_qs = (
                StatusHistory.objects.filter(
                    timestamp__range=(start_dt, end_dt), duration__isnull=False
                )
                .values("new_phase")
                .annotate(avg=Avg("duration"))
                .order_by("new_phase")
            )
            phase_cycle_times = [
                {
                    "phase": row["new_phase"].replace("_", " ").title(),
                    "avg_seconds": _duration_seconds(row["avg"]),
                }
                for row in phase_cycle_qs
            ]

            def _avg_duration_by_insurance(start_phase, end_phase):
                start_sub = Subquery(
                    StatusHistory.objects.filter(job=OuterRef("pk"), new_phase=start_phase)
                    .order_by("timestamp")
                    .values("timestamp")[:1]
                )
                end_sub = Subquery(
                    StatusHistory.objects.filter(job=OuterRef("pk"), new_phase=end_phase)
                    .order_by("timestamp")
                    .values("timestamp")[:1]
                )
                qs = (
                    Job.objects.select_related("vehicle")
                    .annotate(start_ts=start_sub, end_ts=end_sub)
                    .filter(start_ts__isnull=False, end_ts__isnull=False)
                    .filter(end_ts__range=(start_dt, end_dt))
                    .filter(end_ts__gte=F("start_ts"))
                    .annotate(
                        duration=ExpressionWrapper(
                            F("end_ts") - F("start_ts"),
                            output_field=models.DurationField(),
                        )
                    )
                    .values("vehicle__insurance_company")
                    .annotate(avg=Avg("duration"))
                    .order_by("-avg")
                )
                return [
                    {
                        "insurance": row["vehicle__insurance_company"] or "Unknown",
                        "avg_seconds": _duration_seconds(row["avg"]),
                    }
                    for row in qs
                ]

            loa_by_insurance = _avg_duration_by_insurance(
                JobPhase.APPROVAL_LOA_PROCESSING, JobPhase.APPROVAL_LOA_APPROVED
            )
            payment_by_insurance = _avg_duration_by_insurance(
                JobPhase.BILLING_PENDING, JobPhase.BILLING_PAID
            )

            repair_start_sub = Subquery(
                StatusHistory.objects.filter(
                    job=OuterRef("pk"), new_phase=JobPhase.REPAIR_ONGOING_REPAIR
                )
                .order_by("timestamp")
                .values("timestamp")[:1]
            )
            repair_end_sub = Subquery(
                StatusHistory.objects.filter(
                    job=OuterRef("pk"), new_phase=JobPhase.REPAIR_INSPECTION_TESTING
                )
                .order_by("timestamp")
                .values("timestamp")[:1]
            )

            repair_qs = (
                Job.objects.select_related("vehicle")
                .annotate(start_ts=repair_start_sub, end_ts=repair_end_sub)
                .filter(start_ts__isnull=False, end_ts__isnull=False)
                .filter(end_ts__range=(start_dt, end_dt))
                .filter(end_ts__gte=F("start_ts"))
                .annotate(
                    duration=ExpressionWrapper(
                        F("end_ts") - F("start_ts"), output_field=models.DurationField()
                    )
                )
            )

            price_bucket = Case(
                When(approved_loa_amount__lt=50000, then=Value("₱0-₱50K")),
                When(approved_loa_amount__lt=150000, then=Value("₱50K-₱150K")),
                When(approved_loa_amount__lt=300000, then=Value("₱150K-₱300K")),
                When(approved_loa_amount__lt=700000, then=Value("₱300K-₱700K")),
                default=Value("₱700K+"),
                output_field=CharField(),
            )

            repair_by_price = (
                repair_qs.annotate(price_bucket=price_bucket)
                .values("price_bucket")
                .annotate(avg=Avg("duration"))
                .order_by("price_bucket")
            )
            repair_by_price_data = [
                {"range": row["price_bucket"], "avg_seconds": _duration_seconds(row["avg"])}
                for row in repair_by_price
            ]

            repair_by_model = (
                repair_qs.values("vehicle__model")
                .annotate(avg=Avg("duration"))
                .order_by("-avg")
            )
            repair_by_model_data = [
                {
                    "model": row["vehicle__model"] or "Unknown",
                    "avg_seconds": _duration_seconds(row["avg"]),
                }
                for row in repair_by_model
            ]

            repair_by_model_price = (
                repair_qs.annotate(price_bucket=price_bucket)
                .values("vehicle__model", "price_bucket")
                .annotate(avg=Avg("duration"))
                .order_by("vehicle__model", "price_bucket")
            )
            repair_by_model_price_data = [
                {
                    "model": row["vehicle__model"] or "Unknown",
                    "range": row["price_bucket"],
                    "avg_seconds": _duration_seconds(row["avg"]),
                }
                for row in repair_by_model_price
            ]

            pending_repair_phases = [
                JobPhase.REPAIR_WAITING_SCHEDULING,
                JobPhase.REPAIR_WAITING_PARTS,
            ]
            parts_arrived_sub = Subquery(
                StatusHistory.objects.filter(job=OuterRef("pk"), new_phase=JobPhase.PARTS_ARRIVED)
                .order_by("-timestamp")
                .values("timestamp")[:1]
            )
            now = timezone.now()
            pending_repair_qs = (
                Job.objects.filter(phase__in=pending_repair_phases)
                .annotate(parts_arrived=parts_arrived_sub)
                .filter(parts_arrived__isnull=False)
                .annotate(
                    duration=ExpressionWrapper(
                        Value(now) - F("parts_arrived"),
                        output_field=models.DurationField(),
                    )
                )
            )
            pending_repair_avg = pending_repair_qs.aggregate(avg=Avg("duration")).get("avg")

            return _cached_response(
                {
                    "range": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                    },
                    "phaseCycleTimes": phase_cycle_times,
                    "loaApprovalByInsurance": loa_by_insurance,
                    "paymentSpeedByInsurance": payment_by_insurance,
                    "repairTimeByPriceRange": repair_by_price_data,
                    "repairTimeByModel": repair_by_model_data,
                    "repairTimeByModelPrice": repair_by_model_price_data,
                    "pendingRepair": {
                        "count": pending_repair_qs.count(),
                        "avg_seconds": _duration_seconds(pending_repair_avg),
                    },
                },
                s_maxage=60,
                stale_revalidate=180,
            )
        finally:
            _log_timing("TablesAPIView.get", request, _start)


class CsvImportAPIView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_403_FORBIDDEN)

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "CSV file is required."}, status=status.HTTP_400_BAD_REQUEST)

        columns_raw = request.POST.get("columns")
        selected_columns = None
        if columns_raw:
            selected_columns = {col.strip() for col in columns_raw.split(",") if col.strip()}

        try:
            content = upload.read().decode("utf-8-sig")
        except Exception:
            return Response({"detail": "Unable to read CSV file."}, status=status.HTTP_400_BAD_REQUEST)

        import csv
        from io import StringIO

        reader = csv.DictReader(StringIO(content))
        created = 0
        skipped = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            data = {k: v for k, v in row.items() if k}
            if selected_columns is not None:
                data = {k: v for k, v in data.items() if k in selected_columns}

            plate = data.get("plate_number") or data.get("plate") or data.get("plateNumber")
            if not plate:
                skipped += 1
                errors.append(f"Row {idx}: missing plate_number.")
                continue

            customer_name = data.get("customer_name") or data.get("customer") or "Unnamed Customer"
            customer, _ = Customer.objects.get_or_create(name=customer_name)
            if data.get("customer_phone"):
                customer.phone = data.get("customer_phone")
            if data.get("customer_email"):
                customer.email = data.get("customer_email")
            if data.get("customer_address"):
                customer.address = data.get("customer_address")
            customer.save()

            vehicle, _ = Vehicle.objects.get_or_create(
                plate_number=plate,
                defaults={
                    "customer": customer,
                    "model": data.get("vehicle_model") or data.get("model") or "Unknown",
                    "insurance_company": data.get("insurance_company") or data.get("insurance") or "Unknown",
                },
            )

            if vehicle.customer_id != customer.id:
                vehicle.customer = customer
            if data.get("vehicle_model") or data.get("model"):
                vehicle.model = data.get("vehicle_model") or data.get("model")
            if data.get("insurance_company") or data.get("insurance"):
                vehicle.insurance_company = data.get("insurance_company") or data.get("insurance")
            vehicle.save()

            phase = data.get("phase") or JobPhase.APPROVAL_ESTIMATE_DONE
            valid_phases = {choice[0] for choice in JobPhase.choices}
            if phase not in valid_phases:
                phase = JobPhase.APPROVAL_ESTIMATE_DONE

            Job.objects.create(
                vehicle=vehicle,
                description=data.get("description", ""),
                total_estimate=data.get("total_estimate") or 0,
                approved_loa_amount=data.get("approved_loa_amount") or 0,
                parts_price=data.get("parts_price") or 0,
                labor_cost=data.get("labor_cost") or 0,
                vat=data.get("vat") or 0,
                total_cost=data.get("total_cost") or 0,
                phase=phase,
            )
            created += 1

        return Response(
            {
                "created": created,
                "skipped": skipped,
                "errors": errors[:10],
            },
            status=status.HTTP_201_CREATED,
        )


class CsvExportAPIView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_403_FORBIDDEN)

        filename = timezone.localtime().strftime("modu_database_export_%Y%m%d_%H%M%S.csv")
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "job_id",
                "customer_name",
                "customer_phone",
                "customer_email",
                "customer_address",
                "vehicle_model",
                "plate_number",
                "insurance_company",
                "description",
                "total_estimate",
                "approved_loa_amount",
                "parts_price",
                "labor_cost",
                "vat",
                "total_cost",
                "current_phase",
                "job_created_at",
                "job_updated_at",
                "history_id",
                "old_phase",
                "new_phase",
                "status_timestamp",
                "duration_seconds",
                "changed_by_user_id",
            ]
        )

        jobs = Job.objects.select_related("vehicle", "vehicle__customer").prefetch_related("status_history").order_by("id")
        for job in jobs.iterator():
            customer = job.vehicle.customer
            base = [
                job.id,
                customer.name,
                customer.phone,
                customer.email,
                customer.address,
                job.vehicle.model,
                job.vehicle.plate_number,
                job.vehicle.insurance_company,
                job.description,
                job.total_estimate,
                job.approved_loa_amount,
                job.parts_price,
                job.labor_cost,
                job.vat,
                job.total_cost,
                job.phase,
                timezone.localtime(job.created_at).isoformat(),
                timezone.localtime(job.updated_at).isoformat(),
            ]

            history_entries = list(job.status_history.all().order_by("timestamp"))
            if not history_entries:
                writer.writerow(base + ["", "", "", "", "", ""])
                continue

            for entry in history_entries:
                duration_seconds = (
                    entry.duration.total_seconds() if entry.duration is not None else ""
                )
                writer.writerow(
                    base
                    + [
                        entry.id,
                        entry.old_phase or "",
                        entry.new_phase,
                        timezone.localtime(entry.timestamp).isoformat(),
                        duration_seconds,
                        entry.user_id or "",
                    ]
                )

        return response

# Create your views here.
