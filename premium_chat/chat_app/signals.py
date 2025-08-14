# signals.py - Сигналы Django для приложения chat_app

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import ChatSession, ChatMessage
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ChatSession)
def chat_session_created(sender, instance, created, **kwargs):
    """
    Сигнал, срабатывающий при создании новой сессии чата.
    """
    if created:
        logger.info(f"Создана новая сессия чата: {instance.session_id}")


@receiver(post_save, sender=ChatMessage)
def chat_message_created(sender, instance, created, **kwargs):
    """
    Сигнал, срабатывающий при создании нового сообщения.
    """
    if created:
        logger.info(f"Создано новое сообщение в сессии {instance.session.session_id}")
        
        # Обновляем время последнего обновления сессии
        instance.session.save()


@receiver(pre_delete, sender=ChatSession)
def chat_session_deleted(sender, instance, **kwargs):
    """
    Сигнал, срабатывающий перед удалением сессии чата.
    """
    logger.info(f"Удаляется сессия чата: {instance.session_id}")


@receiver(pre_delete, sender=ChatMessage)
def chat_message_deleted(sender, instance, **kwargs):
    """
    Сигнал, срабатывающий перед удалением сообщения.
    """
    logger.info(f"Удаляется сообщение из сессии {instance.session.session_id}")
