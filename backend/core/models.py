from django.db import models
import uuid

# Create your models here.

#Defining my models (Create Classes first that I need for my data)

class Customer_Data(models.Model):
        customer_uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
        car_model = models.CharField(max_length=255)
        insurance = models.CharField(max_length=255)
        date_created = models.DateTimeField(auto_now_add=True)
        last_update = models.DateTimeField(auto_now=True)

        def __str__(self):
             return f"{self.name} - {self.car_model}"

class RepairJob(models.Model):
#LINK TO CUSTOMER 
        customer = models.ForeignKey(Customer_Data, on_delete=models.CASCADE, related_name="jobs")
        repairjob_uid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

# ----- LIVE TRACKER ------- 
        current_status = models.ForeignKey(
                'Status',
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                related_name="active_jobs"
        )

# ----- PHASE 1 (ESTIMATE PHASE) ------
        images = models.ImageField(upload_to='repair_damages/', blank=True, null=True)
        estimate_price = models.DecimalField(max_digits=10, decimal_places=2)
        estimate_date = models.DateTimeField(auto_now_add=True)
        repair_order = models.TextField()
        job_order = models.TextField()
# ------- PHASE 2 (APPROVED PHASE) ------
        approved_estimate = models.DecimalField(max_digits=10, decimal_places=2)
        approved_repair_order = models.TextField(null=True, blank=True)
        approved_job_order = models.TextField(null=True, blank=True)
        loa_date = models.DateTimeField(null=True, blank=True)

#------ PHASE 3 (GAP/DIFFERENCE) ----- 

        @property
        def price_variance(self):
                if self.loa_approved_total:
                        return self.loa_approved_total - self.initial_estimate_total
                return 0

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
        status = models.CharField(max_length=50) #eg. "LOA REJECTED"
        color_code = models.CharField(max_length=7, default="#3498db")

        def __str__(self):
                return f"[{self.get_category_display()}] {self.name}"

class Status_Log(models.Model):
        repair_job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name="history")
        status = models.ForeignKey(Status, on_delete=models.CASCADE)
        changed_at = models.DateTimeField(auto_now_add=True)
        notes = models.TextField(blank=True) #"Parts are late"











