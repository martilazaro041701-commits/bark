import uuid
from django.db import models
from django.conf import settings
from decimal import Decimal
import datetime


def generate_bark_job_number():
    year = datetime.date.today().year
    last_job = RepairJob.objects.filter(job_number__contains=f"BARK-{year}").order_by('-id').first()
    if not last_job:
        return f"BARK-{year}-0001"
    
   
    last_number = int(last_job.job_number.split('-')[-1])
    new_number = str(last_number + 1).zfill(4)
    return f"BARK-{year}-{new_number}"

class AuditModel(models.Model):
    """Abstract base class to provide audit fields automatically."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="%(class)s_created"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="%(class)s_updated"
    )

    class Meta:
        abstract = True

class Status(models.Model):
    CATEGORY_CHOICES = [
        ('APPROVAL', 'LOA & INSURANCE'),
        ('PARTS', 'Parts Procurement'),
        ('REPAIR', 'Repair Shop Stage'),
        ('PICKUP', 'Releasing Stage'),
        ('BILLING', 'Insurance Claims'),
        ('DISMANTLE', 'Total Wreck'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    status_name = models.CharField(max_length=50)
    color_code = models.CharField(max_length=7, default="#3498db")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.get_category_display()}] {self.status_name}"


class RepairJob(models.Model):
    job_number = models.CharField(
        max_length=20, 
        unique=True, 
        default=generate_bark_job_number, 
        editable=False
    )
    PRIORITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]


    # LINK TO CUSTOMER
    customer = models.ForeignKey("core.Customer", on_delete=models.PROTECT, related_name="bark_jobs")
    vehicle = models.ForeignKey("bark.Vehicle", on_delete=models.PROTECT, related_name="repair_jobs")
    insurance = models.ForeignKey("bark.InsuranceCompany", on_delete=models.PROTECT, related_name="repair_jobs")
    repairjob_uid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_number = models.CharField(max_length=20, unique=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    promised_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ----- LIVE TRACKER -------
    current_status = models.ForeignKey(
        "bark.Status",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    # ----- PHASE 1 (ESTIMATE PHASE) ------
    estimate_price = models.DecimalField(max_digits=10, decimal_places=2)
    estimate_date = models.DateTimeField(auto_now_add=True)
    repair_order = models.TextField()
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2)
    job_order = models.TextField()
    # ------- PHASE 2 (APPROVED PHASE) ------
    approved_estimate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    approved_repair_order = models.TextField(null=True, blank=True)
    approved_job_order = models.TextField(null=True, blank=True)
    loa_date = models.DateTimeField(null=True, blank=True)

    # ------ PHASE 3 (GAP/DIFFERENCE) -----
    @property
    def price_variance(self):
        if self.approved_estimate is not None:
            return self.approved_estimate - self.estimate_price
        return Decimal("0.00")

    def __str__(self):
        return f"RepairJob {self.repairjob_uid}"


class StatusLog(models.Model):
    repair_job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name="history")
    status = models.ForeignKey(Status, on_delete=models.PROTECT)
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)  # "Parts are late"

    def __str__(self):
        return f"{self.repair_job} -> {self.status} @ {self.changed_at}"
    

class InsuranceCompany(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Vehicle(models.Model):
    owner = models.ForeignKey("core.Customer", on_delete=models.PROTECT, related_name="vehicles")
    model = models.CharField(max_length=255)
    plate_number = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.model} ({self.plate_number})" if self.plate_number else self.model
    
class JobMedia(models.Model):
    repair_job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name="media")
    image = models.ImageField(upload_to="repair_damages/")
    uploaded_at = models.DateTimeField(auto_now_add=True)







