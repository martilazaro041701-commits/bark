from django.contrib import admin

from .models import Customer, Job, StatusHistory, Vehicle


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email")
    search_fields = ("name", "phone", "email")


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("model", "plate_number", "insurance_company", "customer")
    list_editable = ("plate_number", "insurance_company")
    list_filter = ("insurance_company",)
    search_fields = ("model", "plate_number", "insurance_company", "customer__name")


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("id", "vehicle", "phase", "total_cost", "updated_at")
    list_filter = ("phase", "vehicle__insurance_company")
    search_fields = ("vehicle__plate_number", "vehicle__model", "vehicle__customer__name")


@admin.register(StatusHistory)
class StatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("job", "old_phase", "new_phase", "timestamp", "duration", "user")
    list_filter = ("old_phase", "new_phase", "user")
    search_fields = ("job__id",)
