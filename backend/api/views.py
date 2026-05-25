from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from .serializers import TransactionSerializer

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

