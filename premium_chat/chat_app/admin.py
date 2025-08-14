from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    ChatSession, ChatMessage, UserProfile, ChatTemplate, 
    ChatExport, UserStatistics
)

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id_short', 'title', 'user', 'message_count', 'created_at', 'updated_at', 'is_active']
    list_filter = ['is_active', 'created_at', 'user']
    search_fields = ['session_id', 'title', 'user__username']
    readonly_fields = ['id', 'session_id', 'created_at', 'updated_at', 'message_count']
    list_per_page = 50
    
    def session_id_short(self, obj):
        return f"{obj.session_id[:8]}..."
    session_id_short.short_description = "Session ID"
    
    def message_count(self, obj):
        count = obj.messages.count()
        url = reverse('admin:chat_app_chatmessage_changelist') + f'?session__id__exact={obj.id}'
        return format_html('<a href="{}">{} сообщений</a>', url, count)
    message_count.short_description = "Сообщения"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id_short', 'session_title', 'message_type', 'content_preview', 'provider_used', 'response_time', 'created_at']
    list_filter = ['message_type', 'provider_used', 'created_at', 'is_favorite']
    search_fields = ['content', 'session__title', 'session__session_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_per_page = 100
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'session', 'message_type', 'content', 'raw_content', 'is_favorite')
        }),
        ('Метаданные ответа', {
            'fields': ('provider_used', 'model_used', 'response_time', 'attempt_number', 'tokens_used'),
            'classes': ('collapse',)
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def id_short(self, obj):
        return str(obj.id)[:8] + "..."
    id_short.short_description = "ID"
    
    def session_title(self, obj):
        return obj.session.title
    session_title.short_description = "Сессия"
    
    def content_preview(self, obj):
        content = obj.content
        preview = content[:100] + "..." if len(content) > 100 else content
        return mark_safe(f'<span title="{content}">{preview}</span>')
    content_preview.short_description = "Содержимое"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('session')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'preferred_model', 'total_messages', 'total_sessions', 'is_premium', 'premium_until', 'created_at']
    list_filter = ['is_premium', 'preferred_model', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['total_messages', 'total_sessions', 'total_tokens_used', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Пользователь', {
            'fields': ('user',)
        }),
        ('Настройки чата', {
            'fields': ('preferred_model', 'preferred_provider', 'max_history_length')
        }),
        ('Статистика', {
            'fields': ('total_messages', 'total_sessions', 'total_tokens_used'),
            'classes': ('collapse',)
        }),
        ('Премиум', {
            'fields': ('is_premium', 'premium_until'),
            'classes': ('collapse',)
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(ChatTemplate)
class ChatTemplateAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'usage_count', 'is_public', 'created_by', 'created_at']
    list_filter = ['is_public', 'category', 'created_at']
    search_fields = ['title', 'description', 'content']
    readonly_fields = ['id', 'usage_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'content', 'category')
        }),
        ('Настройки', {
            'fields': ('is_public', 'created_by')
        }),
        ('Статистика', {
            'fields': ('usage_count',),
            'classes': ('collapse',)
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(ChatExport)
class ChatExportAdmin(admin.ModelAdmin):
    list_display = ['id_short', 'user', 'session_title', 'format', 'file_size_mb', 'created_at', 'expires_at']
    list_filter = ['format', 'created_at']
    search_fields = ['user__username', 'session__title']
    readonly_fields = ['id', 'file_size', 'created_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8] + "..."
    id_short.short_description = "ID"
    
    def session_title(self, obj):
        return obj.session.title if obj.session else "Все чаты"
    session_title.short_description = "Сессия"
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / 1024 / 1024:.2f} MB"
    file_size_mb.short_description = "Размер файла"

@admin.register(UserStatistics)
class UserStatisticsAdmin(admin.ModelAdmin):
    list_display = ['user', 'messages_today', 'sessions_today', 'messages_month', 'favorite_provider', 'last_updated']
    list_filter = ['favorite_provider', 'last_updated']
    search_fields = ['user__username']
    readonly_fields = ['last_updated']
    
    fieldsets = (
        ('Пользователь', {
            'fields': ('user',)
        }),
        ('Дневная статистика', {
            'fields': ('messages_today', 'sessions_today')
        }),
        ('Недельная статистика', {
            'fields': ('messages_week', 'sessions_week')
        }),
        ('Месячная статистика', {
            'fields': ('messages_month', 'sessions_month')
        }),
        ('Общая статистика', {
            'fields': ('total_characters', 'average_session_length', 'favorite_provider')
        }),
        ('Достижения', {
            'fields': ('achievements',),
            'classes': ('collapse',)
        }),
        ('Последнее обновление', {
            'fields': ('last_updated',)
        })
    )

# Кастомизация админ панели
admin.site.site_header = "Premium ChatGPT Админ"
admin.site.site_title = "Premium ChatGPT"
admin.site.index_title = "Управление Premium ChatGPT"
