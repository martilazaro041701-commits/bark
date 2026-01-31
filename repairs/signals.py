from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Job, StatusHistory


@receiver(pre_save, sender=Job)
def job_phase_pre_save(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_phase = None
        return
    try:
        previous = Job.objects.get(pk=instance.pk)
    except Job.DoesNotExist:
        instance._old_phase = None
        return
    instance._old_phase = previous.phase


@receiver(post_save, sender=Job)
def job_phase_post_save(sender, instance, created, **kwargs):
    old_phase = getattr(instance, "_old_phase", None)
    if created and old_phase is None:
        StatusHistory.objects.create(
            job=instance,
            old_phase=None,
            new_phase=instance.phase,
            user=getattr(instance, "_phase_changed_by", None),
        )
        return

    if old_phase == instance.phase:
        return

    previous_entry = StatusHistory.objects.filter(job=instance).order_by("-timestamp").first()
    duration = None
    if previous_entry:
        duration = timezone.now() - previous_entry.timestamp

    StatusHistory.objects.create(
        job=instance,
        old_phase=old_phase,
        new_phase=instance.phase,
        user=getattr(instance, "_phase_changed_by", None),
        duration=duration,
    )
