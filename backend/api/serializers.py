from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'title', 'notes', 'amount', 'category', 'date', 'type']

    def create(self, validated_data):
        # Inject the authenticated user from the request context
        user = self.context['request'].user
        return Transaction.objects.create(user=user, **validated_data)
