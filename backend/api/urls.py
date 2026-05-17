from django.urls import path
from .views import get_data, GoogleLogin

urlpatterns = [
    path('data/', get_data, name='get_data'),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
]