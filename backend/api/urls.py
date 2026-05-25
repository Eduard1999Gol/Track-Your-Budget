from django.urls import path
from .views import GoogleLoginView, TransactionView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
]