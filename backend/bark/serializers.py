from rest_framework import serializers
from django.db import transaction
from core.models import Customer
from .models import RepairJob, Vehicle, InsuranceCompany, Status

# 1. Simple serializers for related data

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'first_name', 'last_name', 'phone', 'email']

class InsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = ['id', 'name']

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle 
        fields = ['id', 'plate_numer', 'make', 'model', 'year', 'color']

class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ['id', 'category', 'status_name', 'color_code', 'order']

# 2. The Super Serializer (The Engine)

class RepairJobSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer
    vehicle = VehicleSerializer
    insurance = InsuranceSerializer(required=False, allow_null=True)

    class Meta:
        model = RepairJob
        fields = [
            'id', 'job_number', 'customer', 'vehicle', 'insurance',
            'priority', 'promised_date', 'status', 'description'
        ]
    
    def create(self, validated_data):

        customer_data = validated_data.pop('customer')
        vehicle_data = validated_data.pop('vehicle')
        insurance_data = validated_data.pop('insurance', None)

        with transaction.atomic():
            customer, _ = Customer.objects.get_or_create(**customer_data)

            insurance = None
            if insurance_data:
                insurance, _ = InsuranceCompany.objects.get_or_create(**insurance_data)

            vehicle, _ = Vehicle.object.get_or_create(customer=customer, **vehicle_data)

            repair_job = RepairJob.object.get_or_create(
                customer=customer,
                vehicle=vehicle,
                insurance=insurance,
                **validated_data
            )

            return repair_job
        
        
