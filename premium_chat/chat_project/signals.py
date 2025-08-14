from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import ChatMessage, UserProfile, UserStatistics, ChatSession

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Создание профиля пользователя при регистрации"""
    if created:
        UserProfile.objects.create(user=instance)
        UserStatistics.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Сохранение профиля пользователя"""
    if hasattr(instance, 'userprofile'):
        instance.userprofile.save()

@receiver(post_save, sender=ChatMessage)
def update_user_statistics(sender, instance, created, **kwargs):
    """Обновление статистики при создании сообщения"""
    if created and instance.session.user:
        user = instance.session.user
        
        # Обновляем профиль
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.total_messages += 1
        profile.save()
        
        # Обновляем статистику
        stats, _ = UserStatistics.objects.get_or_create(user=user)
        stats.total_characters += len(instance.content)
        
        # Обновляем любимого провайдера
        if instance.provider_used:
            stats.favorite_provider = instance.provider_used
        
        stats.save()

@receiver(post_save, sender=ChatSession)
def update_session_count(sender, instance, created, **kwargs):
    """Обновление количества сессий"""
    if created and instance.user:
        profile, _ = UserProfile.objects.get_or_create(user=instance.user)
        profile.total_sessions += 1
        profile.save()
        
        stats, _ = UserStatistics.objects.get_or_create(user=instance.user)
        stats.sessions_today += 1
        stats.save()

@receiver(post_delete, sender=ChatSession)
def decrease_session_count(sender, instance, **kwargs):
    """Уменьшение количества сессий при удалении"""
    if instance.user:
        profile, _ = UserProfile.objects.get_or_create(user=instance.user)
        profile.total_sessions = max(0, profile.total_sessions - 1)
        profile.save()
