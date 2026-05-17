from rest_framework.decorators import api_view
from rest_framework.response import Response
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://localhost:5173" # Must match your frontend URL configuration
    client_class = OAuth2Client

@api_view(['GET'])
def get_data(request):
    data = {"message": "Hello from the Django backend!"}
    return Response(data)