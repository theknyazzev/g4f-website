from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ChatSession, ChatMessage, UserProfile, ChatTemplate, ChatExport, UserStatistics

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'session', 'message_type', 'content', 'raw_content',
            'provider_used', 'model_used', 'response_time', 'attempt_number',
            'created_at', 'updated_at', 'is_favorite', 'tokens_used'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'user', 'session_id', 'title', 'created_at', 'updated_at',
            'is_active', 'messages', 'message_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ChatSessionListSerializer(serializers.ModelSerializer):
    """Упрощенный сериализатор для списка сессий"""
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'session_id', 'title', 'created_at', 'updated_at',
            'is_active', 'message_count', 'last_message_preview'
        ]
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_last_message_preview(self, obj):
        last_message = obj.messages.filter(message_type='user').last()
        if last_message:
            content = last_message.content
            return content[:100] + "..." if len(content) > 100 else content
        return ""

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'preferred_model', 'preferred_provider', 'max_history_length',
            'total_messages', 'total_sessions', 'total_tokens_used',
            'is_premium', 'premium_until', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'total_messages', 'total_sessions', 'total_tokens_used', 'created_at', 'updated_at']

class ChatTemplateSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ChatTemplate
        fields = [
            'id', 'title', 'description', 'content', 'category',
            'is_public', 'created_by', 'usage_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'usage_count', 'created_at', 'updated_at']

class ChatExportSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    session = ChatSessionListSerializer(read_only=True)
    
    class Meta:
        model = ChatExport
        fields = [
            'id', 'user', 'session', 'format', 'file_path', 'file_size',
            'created_at', 'expires_at'
        ]
        read_only_fields = ['id', 'user', 'file_path', 'file_size', 'created_at']

class UserStatisticsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserStatistics
        fields = [
            'user', 'messages_today', 'sessions_today', 'messages_week', 'sessions_week',
            'messages_month', 'sessions_month', 'total_characters', 'average_session_length',
            'favorite_provider', 'achievements', 'last_updated'
        ]
        read_only_fields = ['user', 'last_updated']

class ChatRequestSerializer(serializers.Serializer):
    """Сериализатор для запроса к чату"""
    message = serializers.CharField(max_length=4000)
    session_id = serializers.CharField(max_length=255, required=False)
    model = serializers.CharField(max_length=50, required=False, default="gpt-3.5-turbo")
    provider = serializers.CharField(max_length=100, required=False)
    providers = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        help_text="Список провайдеров для циклического использования"
    )
    include_history = serializers.BooleanField(default=True)
    max_history = serializers.IntegerField(default=50, min_value=1, max_value=100)
    image_data = serializers.CharField(required=False, help_text="Base64 encoded image data")

class ChatResponseSerializer(serializers.Serializer):
    """Сериализатор для ответа чата"""
    success = serializers.BooleanField()
    response = serializers.CharField()
    raw_response = serializers.CharField(required=False)
    model_used = serializers.CharField()
    provider_used = serializers.CharField()
    attempt_number = serializers.IntegerField()
    response_time = serializers.FloatField()
    message_length = serializers.IntegerField()
    history_length = serializers.IntegerField()
    session_id = serializers.CharField()
    message_id = serializers.UUIDField()

class ProviderInfoSerializer(serializers.Serializer):
    """Сериализатор для информации о провайдерах"""
    current = serializers.CharField()
    model = serializers.CharField()
    proxy = serializers.CharField(allow_null=True)
    proxy_enabled = serializers.BooleanField()
    working_providers = serializers.IntegerField()
    backup_providers = serializers.IntegerField()
    provider_stats = serializers.DictField()
    all = serializers.ListField(child=serializers.CharField())
