from django.conf import settings
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Vehicle(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="vehicles")
    model = models.CharField(max_length=255)
    plate_number = models.CharField(max_length=50, unique=True)
    insurance_company = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.model} ({self.plate_number})"


class JobPhase(models.TextChoices):
    APPROVAL_ESTIMATE_DONE = "APPROVAL_ESTIMATE_DONE", "Approval - Estimate Done"
    APPROVAL_LOA_PROCESSING = "APPROVAL_LOA_PROCESSING", "Approval - LOA Processing"
    APPROVAL_LOA_REVISING = "APPROVAL_LOA_REVISING", "Approval - LOA Revising"
    APPROVAL_LOA_REJECTED = "APPROVAL_LOA_REJECTED", "Approval - LOA Rejected"
    APPROVAL_LOA_APPROVED = "APPROVAL_LOA_APPROVED", "Approval - LOA Approved"
    APPROVAL_AWAITING_CUSTOMER = "APPROVAL_AWAITING_CUSTOMER", "Approval - Awaiting Customer Confirmation"

    PARTS_AVAILABLE = "PARTS_AVAILABLE", "Parts - Available"
    PARTS_ORDERED = "PARTS_ORDERED", "Parts - Ordered"
    PARTS_PARTIAL_RECEIVED = "PARTS_PARTIAL_RECEIVED", "Parts - Partial Received"
    PARTS_ARRIVED = "PARTS_ARRIVED", "Parts - Arrived"

    REPAIR_WAITING_SCHEDULING = "REPAIR_WAITING_SCHEDULING", "Repair - Waiting for Scheduling"
    REPAIR_WAITING_PARTS = "REPAIR_WAITING_PARTS", "Repair - Waiting for Parts"
    REPAIR_ONGOING_REPAIR = "REPAIR_ONGOING_REPAIR", "Repair - Ongoing Repair"
    REPAIR_ONGOING_BODY_WORK = "REPAIR_ONGOING_BODY_WORK", "Repair - Ongoing Body Work"
    REPAIR_ONGOING_BODY_PAINT = "REPAIR_ONGOING_BODY_PAINT", "Repair - Ongoing Body Paint"
    REPAIR_WAITING_DROPOFF = "REPAIR_WAITING_DROPOFF", "Repair - Waiting for Drop-off"
    REPAIR_INSPECTION_TESTING = "REPAIR_INSPECTION_TESTING", "Repair - Inspection/Testing"

    PICKUP_READY = "PICKUP_READY", "Pickup - Ready"
    PICKUP_CONTACTED = "PICKUP_CONTACTED", "Pickup - Contacted"
    PICKUP_RELEASED = "PICKUP_RELEASED", "Pickup - Released"

    BILLING_PENDING = "BILLING_PENDING", "Billing - Pending"
    BILLING_PAID = "BILLING_PAID", "Billing - Paid"
    BILLING_RELEASED = "BILLING_RELEASED", "Billing - Released"

    DISMANTLE_FOR_DISMANTLE = "DISMANTLE_FOR_DISMANTLE", "Dismantle - For Dismantle"

    CANCELLED = "CANCELLED", "Cancelled"


class Job(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="jobs")
    description = models.TextField(blank=True)
    total_estimate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    approved_loa_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    parts_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    phase = models.CharField(max_length=64, choices=JobPhase.choices, default=JobPhase.APPROVAL_ESTIMATE_DONE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Job {self.pk} - {self.vehicle}"

    @property
    def total_duration_in_shop(self):
        return timezone.now() - self.created_at

    def change_phase(self, new_phase, user=None, save_kwargs=None):
        self._phase_changed_by = user
        self.phase = new_phase
        self.save(**(save_kwargs or {}))


class StatusHistory(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="status_history")
    old_phase = models.CharField(max_length=64, choices=JobPhase.choices, blank=True, null=True)
    new_phase = models.CharField(max_length=64, choices=JobPhase.choices)
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    duration = models.DurationField(blank=True, null=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["job", "timestamp"]),
            models.Index(fields=["old_phase"]),
            models.Index(fields=["new_phase"]),
        ]

    def __str__(self) -> str:
        return f"Job {self.job_id}: {self.old_phase} -> {self.new_phase}"
