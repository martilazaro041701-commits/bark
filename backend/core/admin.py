from django.contrib import admin
from .models import Customer
from bark.models import RepairJob

class RepairJobInline(admin.TabularInline):
    model = RepairJob
    extra = 0
    fields = ("repairjob_uid", "estimate_price", "current_status", "estimate_date")
    readonly_fields = fields
    show_change_link = True

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "contact_number", "email", "customer_uuid", "last_update")
    search_fields = ("full_name", "contact_number", "email", "customer_uuid")
    inlines = [RepairJobInline]
