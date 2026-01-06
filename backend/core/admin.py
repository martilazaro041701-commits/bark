from django.contrib import admin
from .models import Customer_Data, RepairJob, Status, Status_Log

admin.site.register(Customer_Data)
admin.site.register(Status)
admin.site.register(Status_Log)

@admin.register(RepairJob)
class RepairJobAdmin(admin.ModelAdmin):
    # Columns shown in the main list
    list_display = ('repairjob_uid', 'customer', 'estimate_price', 'current_status', 'estimate_date')
    
    # Sidebar filters
    list_filter = ('current_status', 'estimate_date')
    
    # Search functionality
    search_fields = ('customer__name', 'repairjob_uid')
    
    # This allows you to SEE the calculated variance in the edit page
    # even though it isn't a "real" column in the database
    readonly_fields = ('price_variance',)
