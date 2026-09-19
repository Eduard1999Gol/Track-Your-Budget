import logging
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from allauth.socialaccount.models import SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework.exceptions import APIException

from .models import Transaction
from .serializers import (
    MonthlySummarySerializer,
    TransactionSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class LoggingOAuth2Client(OAuth2Client):
    """OAuth2Client that logs the raw provider response on failure.

    dj-rest-auth catches OAuth2Error and re-raises a generic ValidationError,
    then DRF's is_valid() re-wraps it again, which drops __cause__. Logging at
    the client layer is the only reliable way to see the real error body.
    """

    def get_access_token(self, code, *args, **kwargs):
        try:
            return super().get_access_token(code, *args, **kwargs)
        except OAuth2Error as exc:
            logger.error("OAuth2 token exchange failed: %s", exc)
            raise


GERMAN_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

# How many months back the dashboard chart shows, current month included.
SUMMARY_MONTHS = 3

ZERO = Decimal('0.00')

# Upper bound for one page of the transactions list; the SPA asks for 10.
TRANSACTIONS_MAX_LIMIT = 100


class OptionalLimitOffsetPagination(LimitOffsetPagination):
    """Paginate only when the client asks for it.

    With ``default_limit`` unset, ``paginate_queryset`` returns None unless a
    ``?limit=`` param is present, so the dashboard keeps receiving the plain
    array it always did while the transactions page opts into
    ``{count, next, previous, results}`` pages.
    """

    default_limit = None
    max_limit = TRANSACTIONS_MAX_LIMIT


class SocialProviderMisconfigured(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'This login provider is not configured on the server.'
    default_code = 'provider_not_configured'


class ConfiguredSocialLoginView(SocialLoginView):
    """SocialLoginView that fails as JSON instead of an HTML debug page.

    allauth's adapter.get_app() raises SocialApp.DoesNotExist when no
    SocialApp row exists for the provider on this site. DRF's default
    exception_handler only formats APIException/Http404/PermissionDenied and
    re-raises anything else, so the swap has to happen *inside*
    handle_exception: raising from dispatch() would already be past DRF's
    try/except and end up as Django's HTML 500 page instead of a JSON 503.
    """

    def handle_exception(self, exc):
        if isinstance(exc, SocialApp.DoesNotExist):
            exc = SocialProviderMisconfigured()
        return super().handle_exception(exc)


class GoogleLogin(ConfiguredSocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = OAuth2Client


class GitHubLogin(ConfiguredSocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = OAuth2Client


class MicrosoftLogin(ConfiguredSocialLoginView):
    adapter_class = MicrosoftGraphOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = LoggingOAuth2Client


class HealthView(APIView):
    """Liveness/readiness target for Kubernetes.

    Unauthenticated on purpose — the probe has no credentials. It only reports
    that the app booted and can answer; it deliberately does not touch the DB,
    so a database blip restarts nothing.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)


class UserMe(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class TransactionView(APIView):
    permission_classes = [IsAuthenticated]

    pagination_class = OptionalLimitOffsetPagination

    @staticmethod
    def _parse_date(params, key):
        raw = params.get(key)
        if not raw:
            return None
        try:
            return date.fromisoformat(raw)
        except ValueError:
            raise ValidationError({key: 'Use the format YYYY-MM-DD.'})

    def filter_queryset(self, request):
        """Apply the optional query-string filters of the transactions page.

        ``category`` / ``type`` match exactly, ``search`` is a case-insensitive
        substring match on title or notes, ``date_from`` / ``date_to`` are
        inclusive ISO dates. Unknown category/type values simply match nothing.
        """
        params = request.query_params
        # Explicit secondary key so limit/offset pages never overlap or skip
        # rows that share the same date.
        queryset = request.user.transactions.order_by('-date', '-id')

        category = params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        tx_type = params.get('type')
        if tx_type:
            queryset = queryset.filter(type=tx_type)

        search = params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(notes__icontains=search)
            )

        date_from = self._parse_date(params, 'date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        date_to = self._parse_date(params, 'date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset

    def get(self, request):
        transactions = self.filter_queryset(request)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(transactions, request, view=self)
        if page is not None:
            serializer = TransactionSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TransactionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        result = []

        for offset in range(SUMMARY_MONTHS - 1, -1, -1):
            # Counting in absolute months and splitting back out with divmod
            # handles the year rollover directly, without a borrow loop.
            year, month_index = divmod(today.year * 12 + today.month - 1 - offset, 12)
            month = month_index + 1

            # One conditional aggregate instead of two filtered queries per month.
            totals = request.user.transactions.filter(
                date__year=year, date__month=month
            ).aggregate(
                income=Sum('amount', filter=Q(type=Transaction.TransactionType.INCOME)),
                expense=Sum('amount', filter=Q(type=Transaction.TransactionType.EXPENSE)),
            )

            result.append({
                'month': GERMAN_MONTHS[month_index],
                # Stays Decimal; the serializer decides the representation.
                'income': totals['income'] or ZERO,
                'expense': totals['expense'] or ZERO,
            })

        serializer = MonthlySummarySerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

