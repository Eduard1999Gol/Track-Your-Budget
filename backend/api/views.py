from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from django.db.models import Sum
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from datetime import date
from .models import Transaction
from .serializers import TransactionSerializer

GERMAN_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

class GoogleLoginView(APIView):
    # Allow unauthenticated users to access this endpoint
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        token = request.data.get('access_token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            # 1. Verify the Google ID Token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                settings.GOOGLE_OAUTH2_CLIENT_ID
            )

            # 2. Guard against spoofed issuers
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                return Response({'error': 'Invalid token issuer'}, status=status.HTTP_400_BAD_REQUEST)

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # 3. Retrieve or create the user in Django database
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email, # Fallback, or generate unique string
                    'first_name': first_name,
                    'last_name': last_name,
                }
            )

            # 4. Enforce: Only Google Auth accounts work
            if created:
                # Disables standard password authentication completely for this user
                user.set_unusable_password()
                user.save()

            # 5. Mint your backend's own Application JWTs
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }, status=status.HTTP_200_OK)

        except ValueError:
            return Response({'error': 'Invalid Google Token'}, status=status.HTTP_400_BAD_REQUEST)


class TransactionView(APIView):
    def get(self, request):
        transactions = request.user.transactions.all()
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TransactionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailView(APIView):
    def get_object(self, request, pk):
        try:
            return request.user.transactions.get(pk=pk)
        except Transaction.DoesNotExist:
            return None

    def put(self, request, pk):
        transaction = self.get_object(request, pk)
        if transaction is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = TransactionSerializer(transaction, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        transaction = self.get_object(request, pk)
        if transaction is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MonthlySummaryView(APIView):
    def get(self, request):
        today = date.today()
        result = []

        for i in range(2, -1, -1):
            month = today.month - i
            year = today.year
            while month <= 0:
                month += 12
                year -= 1

            qs = request.user.transactions.filter(date__year=year, date__month=month)
            income = qs.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
            expense = qs.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0

            result.append({
                'month': GERMAN_MONTHS[month - 1],
                'income': float(income),
                'expense': float(expense),
            })

        return Response(result, status=status.HTTP_200_OK)

