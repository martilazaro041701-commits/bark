from django.conf import settings
from django.db import models
import uuid

# Core app reserved for MODU-level/global entities (profiles, settings).

class Customer(models.Model):
    customer_uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    date_created = models.DateTimeField(auto_now_add=True)
    last_update = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name

class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    default_tool = models.CharField(max_length=100, blank=True, default="")
    role = models.CharField(max_length=100, blank=True, default="")

class ToolPermission(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tool_permissions",
    )
    tool_name = models.CharField(max_length=100)

class Meta:
        unique_together = ("user", "tool_name")
 








