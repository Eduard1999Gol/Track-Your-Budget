import json
import logging
import requests
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files import File
from allauth.socialaccount.models import SocialAccount
from .models import Profile

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)

@receiver(post_save, sender=SocialAccount)
def create_profile_avatar(sender, instance, created, **kwargs):
    # Log the full provider payload so we can see everything the social provider returned.
    logger.info(
    "SocialAccount %s for user=%s (id=%s) provider=%s uid=%s extra_data=\n%s",
    "created" if created else "updated",
    instance.user.username,
    instance.user.id,
    instance.provider,
    instance.uid,
    json.dumps(instance.extra_data, indent=2, ensure_ascii=False, default=str),
    )
    if created:
        user = instance.user
        profile, _ = Profile.objects.get_or_create(user=user)
        try:
            image_url = instance.extra_data.get("picture")
            if image_url:
                resp = requests.get(image_url, timeout=5)
                resp.raise_for_status()
                file_name = f"{user.username}.png"
                image_file = ContentFile(resp.content)
                profile.avatar.save(file_name, File(image_file), save=True)
        except Exception as e:
            logger.exception("Error saving avatar: %s", e)