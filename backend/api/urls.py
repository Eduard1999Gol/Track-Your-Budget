from django.urls import path
from .views import GoogleLoginView, TransactionView, TransactionDetailView, MonthlySummaryView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='transaction_detail'),
    path('monthly-summary/', MonthlySummaryView.as_view(), name='monthly_summary'),
]