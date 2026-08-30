from django.urls import path
from .views import GoogleLogin, TransactionView, TransactionDetailView, MonthlySummaryView, UserMe
from rest_framework_simplejwt.views import ( 
    TokenRefreshView,
    TokenBlacklistView,
)

urlpatterns = [
    path('google/login/', GoogleLogin.as_view(), name='google_login'),
    path('users/me/', UserMe.as_view(), name='user_detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='transaction_detail'),
    path('monthly-summary/', MonthlySummaryView.as_view(), name='monthly_summary'),
]