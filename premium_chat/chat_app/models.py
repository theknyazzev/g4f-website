from django.db import models
from django.contrib.auth.models import User
import uuid

class ChatSession(models.Model):
    """Модель для сессии чата"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Пользователь")
    session_id = models.CharField(max_length=255, unique=True, verbose_name="ID сессии")
    title = models.CharField(max_length=200, default="Новый чат", verbose_name="Название чата")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    
    class Meta:
        verbose_name = "Сессия чата"
        verbose_name_plural = "Сессии чатов"
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.title} ({self.session_id[:8]}...)"

class ChatMessage(models.Model):
    """Модель для сообщений в чате"""
    MESSAGE_TYPES = [
        ('user', 'Пользователь'),
        ('assistant', 'Ассистент'),
        ('system', 'Система'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages', verbose_name="Сессия")
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, verbose_name="Тип сообщения")
    content = models.TextField(verbose_name="Содержимое")
    raw_content = models.TextField(blank=True, verbose_name="Исходное содержимое")
    
    # Метаданные ответа ИИ
    provider_used = models.CharField(max_length=100, blank=True, verbose_name="Использованный провайдер")
    model_used = models.CharField(max_length=100, blank=True, verbose_name="Использованная модель")
    response_time = models.FloatField(null=True, blank=True, verbose_name="Время ответа (сек)")
    attempt_number = models.IntegerField(null=True, blank=True, verbose_name="Номер попытки")
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    # Дополнительные поля
    is_favorite = models.BooleanField(default=False, verbose_name="В избранном")
    tokens_used = models.IntegerField(null=True, blank=True, verbose_name="Использовано токенов")
    
    class Meta:
        verbose_name = "Сообщение чата"
        verbose_name_plural = "Сообщения чатов"
        ordering = ['created_at']
    
    def __str__(self):
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.get_message_type_display()}: {content_preview}"

class UserProfile(models.Model):
    """Расширенная модель профиля пользователя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Пользователь")
    
    # Google OAuth поля
    google_id = models.CharField(max_length=100, blank=True, verbose_name="Google ID")
    google_picture = models.URLField(blank=True, verbose_name="Google аватар")
    display_name = models.CharField(max_length=100, blank=True, verbose_name="Отображаемое имя")
    
    # Настройки чата
    preferred_model = models.CharField(max_length=50, default="gpt-3.5-turbo", verbose_name="Предпочитаемая модель")
    preferred_provider = models.CharField(max_length=100, blank=True, verbose_name="Предпочитаемый провайдер")
    max_history_length = models.IntegerField(default=50, verbose_name="Максимальная длина истории")
    
    # Статистика
    total_messages = models.IntegerField(default=0, verbose_name="Всего сообщений")
    total_sessions = models.IntegerField(default=0, verbose_name="Всего сессий")
    total_tokens_used = models.BigIntegerField(default=0, verbose_name="Всего использовано токенов")
    
    # Премиум настройки
    is_premium = models.BooleanField(default=False, verbose_name="Премиум аккаунт")
    premium_until = models.DateTimeField(null=True, blank=True, verbose_name="Премиум до")
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"
        ordering = ['created_at']
    
    def __str__(self):
        return f"Профиль {self.user.username}"

class ChatTemplate(models.Model):
    """Шаблоны для быстрых запросов"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Название шаблона")
    description = models.TextField(blank=True, verbose_name="Описание")
    content = models.TextField(verbose_name="Содержимое шаблона")
    category = models.CharField(max_length=50, blank=True, verbose_name="Категория")
    
    # Видимость
    is_public = models.BooleanField(default=True, verbose_name="Публичный")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Создал")
    
    # Статистика
    usage_count = models.IntegerField(default=0, verbose_name="Количество использований")
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    class Meta:
        verbose_name = "Шаблон чата"
        verbose_name_plural = "Шаблоны чатов"
        ordering = ['-usage_count', '-created_at']
    
    def __str__(self):
        return self.title

class ChatExport(models.Model):
    """Экспорт чатов"""
    EXPORT_FORMATS = [
        ('json', 'JSON'),
        ('txt', 'Текстовый файл'),
        ('pdf', 'PDF'),
        ('html', 'HTML'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Пользователь")
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Сессия")
    
    format = models.CharField(max_length=10, choices=EXPORT_FORMATS, verbose_name="Формат")
    file_path = models.CharField(max_length=500, verbose_name="Путь к файлу")
    file_size = models.BigIntegerField(verbose_name="Размер файла (байт)")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Истекает")
    
    class Meta:
        verbose_name = "Экспорт чата"
        verbose_name_plural = "Экспорты чатов"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Экспорт {self.format} для {self.user.username}"

class UserStatistics(models.Model):
    """Статистика пользователя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Пользователь")
    
    # Ежедневная статистика
    messages_today = models.IntegerField(default=0, verbose_name="Сообщений сегодня")
    sessions_today = models.IntegerField(default=0, verbose_name="Сессий сегодня")
    
    # Недельная статистика
    messages_week = models.IntegerField(default=0, verbose_name="Сообщений за неделю")
    sessions_week = models.IntegerField(default=0, verbose_name="Сессий за неделю")
    
    # Месячная статистика
    messages_month = models.IntegerField(default=0, verbose_name="Сообщений за месяц")
    sessions_month = models.IntegerField(default=0, verbose_name="Сессий за месяц")
    
    # Общая статистика
    total_characters = models.BigIntegerField(default=0, verbose_name="Всего символов")
    average_session_length = models.FloatField(default=0.0, verbose_name="Средняя длина сессии")
    favorite_provider = models.CharField(max_length=100, blank=True, verbose_name="Любимый провайдер")
    
    # Достижения
    achievements = models.JSONField(default=list, verbose_name="Достижения")
    
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Последнее обновление")
    
    class Meta:
        verbose_name = "Статистика пользователя"
        verbose_name_plural = "Статистика пользователей"
    
    def __str__(self):
        return f"Статистика {self.user.username}"

class NotionIntegration(models.Model):
    """Настройки интеграции с Notion"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name="Пользователь")
    
    # API настройки
    api_key = models.CharField(max_length=500, verbose_name="API ключ Notion")
    is_enabled = models.BooleanField(default=False, verbose_name="Интеграция включена")
    
    # Настройки страницы
    database_id = models.CharField(max_length=100, blank=True, verbose_name="ID базы данных")
    page_id = models.CharField(max_length=100, blank=True, verbose_name="ID страницы")
    page_title = models.CharField(max_length=200, blank=True, verbose_name="Название страницы")
    selected_page_id = models.CharField(max_length=100, blank=True, verbose_name="ID выбранной страницы")
    selected_page_title = models.CharField(max_length=200, blank=True, verbose_name="Название выбранной страницы")
    
    # Настройки сохранения
    save_user_messages = models.BooleanField(default=False, verbose_name="Сохранять сообщения пользователя")
    save_ai_responses = models.BooleanField(default=True, verbose_name="Сохранять ответы ИИ")
    include_metadata = models.BooleanField(default=True, verbose_name="Включать метаданные")
    
    # Статистика
    total_saves = models.IntegerField(default=0, verbose_name="Всего сохранений")
    last_save_date = models.DateTimeField(null=True, blank=True, verbose_name="Дата последнего сохранения")
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    class Meta:
        verbose_name = "Интеграция с Notion"
        verbose_name_plural = "Интеграции с Notion"
    
    def __str__(self):
        return f"Notion интеграция для {self.user.username}"

class NotionSave(models.Model):
    """Лог сохранений в Notion"""
    integration = models.ForeignKey(NotionIntegration, on_delete=models.CASCADE, verbose_name="Интеграция")
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, verbose_name="Сообщение")
    
    # Notion данные
    notion_page_id = models.CharField(max_length=100, verbose_name="ID страницы в Notion")
    notion_block_id = models.CharField(max_length=100, blank=True, verbose_name="ID блока в Notion")
    
    # Статус
    is_successful = models.BooleanField(default=True, verbose_name="Успешно сохранено")
    error_message = models.TextField(blank=True, verbose_name="Сообщение об ошибке")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата сохранения")
    
    class Meta:
        verbose_name = "Сохранение в Notion"
        verbose_name_plural = "Сохранения в Notion"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Сохранение в Notion {self.created_at.strftime('%d.%m.%Y %H:%M')}"
