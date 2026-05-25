from django.urls import path
from .views import GoogleLoginView, TransactionView

urlpatterns = [
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
]