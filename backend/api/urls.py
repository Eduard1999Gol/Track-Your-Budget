from django.urls import path
from .views import GoogleLoginView, TransactionCreateView

urlpatterns = [
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('transactions/', TransactionCreateView.as_view(), name='transaction_create'),
]