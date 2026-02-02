from django.utils import timezone
from rest_framework import serializers

from .models import Customer, Job, JobPhase, Vehicle


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "name", "phone", "email", "address")


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ("id", "model", "plate_number", "insurance_company")


class JobSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer()
    customer = serializers.SerializerMethodField()
    phase_started_at = serializers.SerializerMethodField()
    total_days = serializers.SerializerMethodField()
    days_in_current_phase = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = (
            "id",
            "phase",
            "description",
            "total_estimate",
            "approved_loa_amount",
            "total_cost",
            "phase_started_at",
            "total_days",
            "days_in_current_phase",
            "updated_at",
            "vehicle",
            "customer",
        )

    def get_customer(self, obj):
        return CustomerSerializer(obj.vehicle.customer).data

    def get_phase_started_at(self, obj):
        latest = obj.status_history.order_by("-timestamp").first()
        return latest.timestamp if latest else obj.updated_at

    def get_total_days(self, obj):
        first_entry = obj.status_history.order_by("timestamp").first()
        start = first_entry.timestamp if first_entry else obj.created_at
        start_date = timezone.localtime(start).date()
        end_date = timezone.localtime(timezone.now()).date()

        if obj.phase == JobPhase.CANCELLED:
            return None

        days = (end_date - start_date).days + 1
        return max(days, 1)

    def get_days_in_current_phase(self, obj):
        latest = obj.status_history.order_by("-timestamp").first()
        if not latest:
            return 0
        start_date = timezone.localtime(latest.timestamp).date()
        end_date = timezone.localtime(timezone.now()).date()
        if obj.phase == JobPhase.CANCELLED:
            return None
        days = (end_date - start_date).days + 1
        return max(days, 1)


class JobCreateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False)
    vehicle_id = serializers.IntegerField(required=False)
    customer = serializers.DictField(required=False)
    vehicle = serializers.DictField(required=False)
    total_estimate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    approved_loa_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    parts_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    labor_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    vat = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    phase = serializers.ChoiceField(choices=JobPhase.choices, required=False)

    def validate(self, attrs):
        vehicle_id = attrs.get("vehicle_id")
        vehicle_data = attrs.get("vehicle")
        if not vehicle_id and not vehicle_data:
            raise serializers.ValidationError("Provide vehicle_id or vehicle data.")
        if vehicle_data and not vehicle_data.get("plate_number"):
            raise serializers.ValidationError("Vehicle plate_number is required.")
        if vehicle_data and not vehicle_data.get("model"):
            raise serializers.ValidationError("Vehicle model is required.")
        if vehicle_data and not vehicle_data.get("insurance_company"):
            raise serializers.ValidationError("Vehicle insurance_company is required.")

        if not attrs.get("customer_id") and not attrs.get("customer") and vehicle_data:
            raise serializers.ValidationError("Provide customer_id or customer data.")
        return attrs

    def create(self, validated_data):
        customer_id = validated_data.get("customer_id")
        vehicle_id = validated_data.get("vehicle_id")
        customer_data = validated_data.get("customer") or {}
        vehicle_data = validated_data.get("vehicle") or {}

        if vehicle_id:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        else:
            if customer_id:
                customer = Customer.objects.get(pk=customer_id)
            else:
                customer = Customer.objects.create(
                    name=customer_data.get("name", "Unnamed Customer"),
                    phone=customer_data.get("phone", ""),
                    email=customer_data.get("email", ""),
                    address=customer_data.get("address", ""),
                )
            vehicle = Vehicle.objects.create(
                customer=customer,
                model=vehicle_data["model"],
                plate_number=vehicle_data["plate_number"],
                insurance_company=vehicle_data["insurance_company"],
            )

        job = Job.objects.create(
            vehicle=vehicle,
            description=validated_data.get("description", ""),
            total_estimate=validated_data.get("total_estimate", 0),
            approved_loa_amount=validated_data.get("approved_loa_amount", 0),
            parts_price=validated_data.get("parts_price", 0),
            labor_cost=validated_data.get("labor_cost", 0),
            vat=validated_data.get("vat", 0),
            total_cost=validated_data.get("total_cost", 0),
            phase=validated_data.get("phase", JobPhase.APPROVAL_ESTIMATE_DONE),
        )
        return job


class StatusHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    old_phase = serializers.CharField(allow_null=True)
    new_phase = serializers.CharField()
    timestamp = serializers.DateTimeField()
    duration = serializers.DurationField(allow_null=True)


class JobDetailSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer()
    customer = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()
    is_superuser = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = (
            "id",
            "phase",
            "description",
            "total_estimate",
            "approved_loa_amount",
            "parts_price",
            "labor_cost",
            "vat",
            "total_cost",
            "updated_at",
            "created_at",
            "vehicle",
            "customer",
            "history",
            "is_superuser",
        )

    def get_customer(self, obj):
        return CustomerSerializer(obj.vehicle.customer).data

    def get_history(self, obj):
        entries = obj.status_history.order_by("-timestamp")[:12]
        return StatusHistorySerializer(entries, many=True).data

    def get_is_superuser(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_superuser


class JobUpdateSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True)
    total_estimate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    approved_loa_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    parts_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    labor_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    vat = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    customer_name = serializers.CharField(required=False, allow_blank=True)
    vehicle_model = serializers.CharField(required=False, allow_blank=True)
    plate_number = serializers.CharField(required=False, allow_blank=True)
    insurance_company = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        for field in (
            "description",
            "total_estimate",
            "approved_loa_amount",
            "parts_price",
            "labor_cost",
            "vat",
            "total_cost",
        ):
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        if "customer_name" in validated_data:
            instance.vehicle.customer.name = validated_data["customer_name"]
            instance.vehicle.customer.save()
        if "vehicle_model" in validated_data:
            instance.vehicle.model = validated_data["vehicle_model"]
        if "plate_number" in validated_data:
            instance.vehicle.plate_number = validated_data["plate_number"]
        if "insurance_company" in validated_data:
            instance.vehicle.insurance_company = validated_data["insurance_company"]
        instance.vehicle.save()
        instance.save()
        return instance
