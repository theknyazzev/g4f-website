from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q, Count, Avg
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from django.views.generic import TemplateView
import uuid
import json
import asyncio
import logging
import requests
import urllib.parse

from .models import (
    ChatSession, ChatMessage, UserProfile, ChatTemplate, 
    ChatExport, UserStatistics
)
from .serializers import (
    ChatSessionSerializer, ChatSessionListSerializer, ChatMessageSerializer,
    UserProfileSerializer, ChatTemplateSerializer, ChatExportSerializer,
    UserStatisticsSerializer, ChatRequestSerializer, ChatResponseSerializer,
    ProviderInfoSerializer
)
from .gpt_service import gpt_service
from django.conf import settings

logger = logging.getLogger(__name__)

class IndexView(TemplateView):
    """Главная страница"""
    template_name = 'index.html'
    
    def get(self, request, *args, **kwargs):
        # Создаем сессию если её нет
        if not request.session.get('session_id'):
            session_id = str(uuid.uuid4())
            request.session['session_id'] = session_id
            request.session.save()
            logger.info(f"Created new session: {session_id}")
        
        return super().get(request, *args, **kwargs)

@api_view(['GET'])
def provider_info(request):
    """Получить информацию о провайдерах GPT"""
    try:
        info = gpt_service.get_provider_info()
        serializer = ProviderInfoSerializer(info)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Ошибка при получении информации о провайдерах: {str(e)}")
        return Response({
            'error': 'Ошибка при получении информации о провайдерах',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@csrf_exempt
def chat_message(request):
    """Отправить сообщение в чат и получить ответ от GPT"""
    try:
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        message = data['message']
        session_id = data.get('session_id')
        model = data.get('model', 'gpt-3.5-turbo')
        provider = data.get('provider')
        providers = data.get('providers', [])  # Новый параметр - список провайдеров
        include_history = data.get('include_history', True)
        max_history = data.get('max_history', 50)
        image_data = data.get('image_data')  # Данные изображения в base64
        
        # Получаем или создаем сессию
        if session_id:
            try:
                session = ChatSession.objects.get(session_id=session_id)
            except ChatSession.DoesNotExist:
                session = ChatSession.objects.create(
                    session_id=session_id,
                    user=request.user if request.user.is_authenticated else None
                )
        else:
            session_id = str(uuid.uuid4())
            session = ChatSession.objects.create(
                session_id=session_id,
                user=request.user if request.user.is_authenticated else None,
                title=message[:50] + "..." if len(message) > 50 else message
            )
        
        # Сохраняем пользовательское сообщение
        user_message = ChatMessage.objects.create(
            session=session,
            message_type='user',
            content=message
        )
        
        # Получаем историю разговора если нужно
        conversation_history = []
        if include_history:
            history_messages = session.messages.order_by('created_at')[:max_history * 2]
            for msg in history_messages:
                if msg.message_type == 'user':
                    conversation_history.append({
                        'message': msg.content,
                        'response': None
                    })
                elif msg.message_type == 'assistant' and conversation_history:
                    conversation_history[-1]['response'] = msg.content
        
        # Меняем провайдера если указан
        if provider and provider != 'null':
            gpt_service.change_provider(provider)
        
        # Получаем ответ от GPT
        if providers:
            logger.info(f"Отправляем сообщение в GPT: {message[:100]}... | Модель: {model} | Провайдеры: {providers} | Текущий: {provider} | Изображение: {'Да' if image_data else 'Нет'}")
        elif provider and provider != 'null':
            logger.info(f"Отправляем сообщение в GPT: {message[:100]}... | Модель: {model} | Провайдер: {provider} | Изображение: {'Да' if image_data else 'Нет'}")
        else:
            logger.info(f"Отправляем сообщение в GPT: {message[:100]}... | Режим: Авто (циклический выбор) | Изображение: {'Да' if image_data else 'Нет'}")
        
        # Передаем модель, список провайдеров и изображение
        # Если есть изображение - принудительно используем vision модель и ПРОВЕРЕННЫЕ провайдеры
        if image_data:
            model_to_use = 'gpt-4-vision-preview'
            # ПРОВЕРЕННЫЕ провайдеры с поддержкой изображений (результат тестирования)
            vision_providers = [
                'Free2GPT',           # 1.2с - самый быстрый!
                'Qwen_Qwen_2_5',      # 2.9с - надежный
                'Qwen_Qwen_2_72B',    # 5.2с - мощный  
                'Qwen_Qwen_2_5_Max'   # 5.5с - максимальный
            ]
            providers_to_use = vision_providers
            logger.info(f"🖼️ ИЗОБРАЖЕНИЕ ОБНАРУЖЕНО! Используем ПРОВЕРЕННЫЕ vision провайдеры: {model_to_use} | Провайдеры: {providers_to_use}")
        else:
            model_to_use = model if model and model != 'null' else None
            providers_to_use = providers if providers else None
        
        gpt_response = gpt_service.get_response_sync(message, conversation_history, model_to_use, providers_to_use, image_data)
        
        if gpt_response.get('success'):
            # Сохраняем ответ ассистента
            assistant_message = ChatMessage.objects.create(
                session=session,
                message_type='assistant',
                content=gpt_response['response'],
                raw_content=gpt_response.get('raw_response', ''),
                provider_used=gpt_response.get('provider_used', ''),
                model_used=gpt_response.get('model_used', model),
                response_time=gpt_response.get('response_time'),
                attempt_number=gpt_response.get('attempt_number')
            )
            
            # Обновляем статистику пользователя
            if request.user.is_authenticated:
                profile, created = UserProfile.objects.get_or_create(user=request.user)
                profile.total_messages += 2  # пользователь + ассистент
                profile.save()
                
                stats, created = UserStatistics.objects.get_or_create(user=request.user)
                stats.messages_today += 2
                stats.total_characters += len(message) + len(gpt_response['response'])
                stats.save()
            
            # Формируем ответ
            response_data = ChatResponseSerializer({
                'success': True,
                'response': gpt_response['response'],
                'raw_response': gpt_response.get('raw_response', ''),
                'model_used': gpt_response.get('model_used', model),
                'provider_used': gpt_response.get('provider_used', ''),
                'attempt_number': gpt_response.get('attempt_number', 1),
                'response_time': gpt_response.get('response_time', 0),
                'message_length': len(message),
                'history_length': len(conversation_history),
                'session_id': session.session_id,
                'message_id': assistant_message.id
            }).data
            
            logger.info(f"Успешный ответ от {gpt_response.get('provider_used', 'unknown')}")
            return Response(response_data)
        else:
            # Сохраняем ошибку
            error_message = ChatMessage.objects.create(
                session=session,
                message_type='system',
                content=f"Ошибка: {gpt_response.get('error', 'Неизвестная ошибка')}",
                raw_content=str(gpt_response)
            )
            
            logger.error(f"Ошибка GPT: {gpt_response.get('error')}")
            return Response({
                'success': False,
                'error': gpt_response.get('error', 'Ошибка при получении ответа'),
                'response': gpt_response.get('response', 'Извините, произошла ошибка. Попробуйте еще раз.'),
                'session_id': session.session_id,
                'total_attempts': gpt_response.get('total_attempts', 0)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Критическая ошибка в chat_message: {str(e)}")
        return Response({
            'success': False,
            'error': 'Критическая ошибка сервера',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatSessionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления сессиями чата"""
    serializer_class = ChatSessionSerializer
    permission_classes = [AllowAny]  # Разрешаем анонимный доступ
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return ChatSession.objects.filter(user=self.request.user)
        else:
            # Для анонимных пользователей возвращаем сессии по session_id из куки
            session_ids = self.request.COOKIES.get('chat_sessions', '').split(',')
            return ChatSession.objects.filter(session_id__in=session_ids)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ChatSessionListSerializer
        return ChatSessionSerializer
    
    @action(detail=True, methods=['post'])
    def rename(self, request, pk=None):
        """Переименовать сессию"""
        session = self.get_object()
        new_title = request.data.get('title', '').strip()
        if new_title:
            session.title = new_title
            session.save()
            return Response({'success': True, 'title': session.title})
        return Response({'error': 'Пустое название'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def clear(self, request, pk=None):
        """Очистить сообщения в сессии"""
        session = self.get_object()
        session.messages.all().delete()
        return Response({'success': True})

class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet для управления сообщениями чата"""
    serializer_class = ChatMessageSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        session_id = self.request.query_params.get('session_id')
        if session_id:
            try:
                session = ChatSession.objects.get(session_id=session_id)
                return session.messages.all()
            except ChatSession.DoesNotExist:
                return ChatMessage.objects.none()
        return ChatMessage.objects.none()

class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet для профилей пользователей"""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

class ChatTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet для шаблонов чата"""
    serializer_class = ChatTemplateSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return ChatTemplate.objects.filter(is_public=True)
    
    @action(detail=True, methods=['post'])
    def use(self, request, pk=None):
        """Использовать шаблон"""
        template = self.get_object()
        template.usage_count += 1
        template.save()
        return Response({'content': template.content})

@api_view(['GET'])
def user_statistics(request):
    """Получить статистику пользователя"""
    if not request.user.is_authenticated:
        return Response({'error': 'Требуется авторизация'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        stats, created = UserStatistics.objects.get_or_create(user=request.user)
        serializer = UserStatisticsSerializer(stats)
        
        # Добавляем дополнительную статистику
        additional_stats = {
            'total_sessions': ChatSession.objects.filter(user=request.user).count(),
            'active_sessions': ChatSession.objects.filter(user=request.user, is_active=True).count(),
            'total_messages': ChatMessage.objects.filter(session__user=request.user).count(),
            'favorite_messages': ChatMessage.objects.filter(session__user=request.user, is_favorite=True).count(),
        }
        
        data = serializer.data
        data.update(additional_stats)
        
        return Response(data)
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {str(e)}")
        return Response({'error': 'Ошибка при получении статистики'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@csrf_exempt
def export_chat(request):
    """Экспортировать чат"""
    try:
        session_id = request.data.get('session_id')
        format = request.data.get('format', 'json')
        
        if not session_id:
            return Response({'error': 'Не указан session_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        session = get_object_or_404(ChatSession, session_id=session_id)
        messages = session.messages.all().order_by('created_at')
        
        if format == 'json':
            data = {
                'session': {
                    'id': str(session.id),
                    'session_id': session.session_id,
                    'title': session.title,
                    'created_at': session.created_at.isoformat(),
                    'updated_at': session.updated_at.isoformat()
                },
                'messages': [
                    {
                        'id': str(msg.id),
                        'type': msg.message_type,
                        'content': msg.content,
                        'created_at': msg.created_at.isoformat(),
                        'provider': msg.provider_used,
                        'response_time': msg.response_time
                    }
                    for msg in messages
                ]
            }
            
            response = HttpResponse(
                json.dumps(data, ensure_ascii=False, indent=2),
                content_type='application/json; charset=utf-8'
            )
            response['Content-Disposition'] = f'attachment; filename="chat_{session.session_id[:8]}.json"'
            return response
            
        elif format == 'txt':
            content = f"Чат: {session.title}\n"
            content += f"Создан: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += "=" * 50 + "\n\n"
            
            for msg in messages:
                if msg.message_type == 'user':
                    content += f"Пользователь ({msg.created_at.strftime('%H:%M:%S')}):\n{msg.content}\n\n"
                elif msg.message_type == 'assistant':
                    content += f"ChatGPT ({msg.created_at.strftime('%H:%M:%S')}):\n{msg.content}\n\n"
            
            response = HttpResponse(content, content_type='text/plain; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="chat_{session.session_id[:8]}.txt"'
            return response
        
        else:
            return Response({'error': 'Неподдерживаемый формат'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Ошибка при экспорте чата: {str(e)}")
        return Response({'error': 'Ошибка при экспорте'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@csrf_exempt
def clear_all_chats(request):
    """Очистить все чаты"""
    try:
        if request.user.is_authenticated:
            # Для авторизованных пользователей
            ChatSession.objects.filter(user=request.user).delete()
        else:
            # Для анонимных пользователей - используем список сессий из куки
            session_ids = request.data.get('session_ids', [])
            if session_ids:
                ChatSession.objects.filter(session_id__in=session_ids).delete()
        
        return Response({'success': True, 'message': 'Все чаты удалены'})
    except Exception as e:
        logger.error(f"Ошибка при очистке чатов: {str(e)}")
        return Response({'error': 'Ошибка при очистке чатов'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def change_provider(request):
    """Изменить провайдера GPT"""
    try:
        provider_name = request.data.get('provider')
        if not provider_name:
            return Response({'error': 'Не указан провайдер'}, status=status.HTTP_400_BAD_REQUEST)
        
        success = gpt_service.change_provider(provider_name)
        if success:
            return Response({
                'success': True,
                'current_provider': gpt_service.get_current_provider(),
                'message': f'Провайдер изменен на {provider_name}'
            })
        else:
            return Response({'error': 'Провайдер не найден'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Ошибка при смене провайдера: {str(e)}")
        return Response({'error': 'Ошибка при смене провайдера'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@csrf_exempt
def generate_image(request):
    """Генерировать изображение из текстового описания"""
    try:
        prompt = request.data.get('prompt')
        provider = request.data.get('provider')  # Опциональный параметр
        
        if not prompt:
            return Response({
                'success': False,
                'error': 'Не указано описание изображения'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Ограничиваем длину промпта
        if len(prompt) > 500:
            return Response({
                'success': False,
                'error': 'Описание изображения слишком длинное (максимум 500 символов)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"[IMAGE_API] Запрос на генерацию изображения: '{prompt[:50]}...'")
        
        # Запускаем генерацию асинхронно
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(gpt_service.generate_image(prompt, provider))
        finally:
            loop.close()
        
        if result['success']:
            logger.info(f"[IMAGE_API] SUCCESS! Изображение сгенерировано провайдером {result['provider']}")
            
            # Сохраняем в базу данных (опционально)
            # Здесь можно добавить сохранение в ChatMessage или отдельную модель
            
            return Response({
                'success': True,
                'image_url': result.get('image_url'),
                'image_data': result.get('image_data'),
                'provider_used': result['provider'],
                'response_time': result['response_time'],
                'prompt': result['prompt']
            })
        else:
            logger.warning(f"[IMAGE_API] ERROR! Не удалось сгенерировать изображение: {result.get('error', 'Неизвестная ошибка')}")
            
            return Response({
                'success': False,
                'error': result.get('error', 'Не удалось сгенерировать изображение'),
                'message': result.get('message', 'Попробуйте другое описание или повторите позже'),
                'quota_errors': result.get('quota_errors', []),
                'providers_tried': result.get('providers_tried', [])
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"[IMAGE_API] Критическая ошибка при генерации изображения: {str(e)}")
        return Response({
            'success': False,
            'error': 'Критическая ошибка сервера',
            'message': 'Произошла ошибка при генерации изображения. Попробуйте позже.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Google OAuth Views
@api_view(['GET'])
def google_auth_init(request):
    """Инициализация Google OAuth"""
    try:
        # Параметры для OAuth URL
        params = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': settings.GOOGLE_OAUTH_CONFIG['redirect_uri'],
            'scope': settings.GOOGLE_OAUTH_CONFIG['scope'],
            'response_type': settings.GOOGLE_OAUTH_CONFIG['response_type'],
            'access_type': settings.GOOGLE_OAUTH_CONFIG['access_type'],
            'prompt': settings.GOOGLE_OAUTH_CONFIG['prompt']
        }
        
        # Создаем URL для авторизации
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
        
        return Response({
            'success': True,
            'auth_url': auth_url
        })
        
    except Exception as e:
        logger.error(f"Google Auth Init Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Ошибка инициализации Google OAuth'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def google_auth_callback(request):
    """Обработка обратного вызова от Google"""
    try:
        code = request.GET.get('code')
        if not code:
            return JsonResponse({
                'success': False,
                'error': 'Код авторизации не получен'
            })
        
        # Обмен кода на токен доступа
        token_data = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.GOOGLE_OAUTH_CONFIG['redirect_uri']
        }
        
        # Получаем токены
        token_response = requests.post(settings.GOOGLE_TOKEN_URL, data=token_data)
        token_json = token_response.json()
        
        if 'access_token' not in token_json:
            logger.error(f"Google Token Error: {token_json}")
            return JsonResponse({
                'success': False,
                'error': 'Не удалось получить токен доступа'
            })
        
        access_token = token_json['access_token']
        
        # Получаем информацию о пользователе
        user_response = requests.get(
            settings.GOOGLE_USER_INFO_URL,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        user_data = user_response.json()
        
        if 'email' not in user_data:
            return JsonResponse({
                'success': False,
                'error': 'Не удалось получить информацию о пользователе'
            })
        
        # Создаем или находим пользователя
        email = user_data['email']
        name = user_data.get('name', email.split('@')[0])
        picture = user_data.get('picture', '')
        
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                'email': email,
                'first_name': name.split(' ')[0] if ' ' in name else name,
                'last_name': name.split(' ', 1)[1] if ' ' in name else ''
            }
        )
        
        # Создаем или обновляем профиль пользователя
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'google_id': user_data.get('id', ''),
                'google_picture': picture,
                'display_name': name
            }
        )
        
        if not profile_created:
            profile.google_id = user_data.get('id', '')
            profile.google_picture = picture
            profile.display_name = name
            profile.save()
        
        # Входим пользователя в систему
        login(request, user)
        
        # Перенаправляем на главную страницу с успешным статусом
        return redirect('/?google_auth=success')
        
    except Exception as e:
        logger.error(f"Google Auth Callback Error: {str(e)}")
        return redirect('/?google_auth=error')


@api_view(['POST'])
def google_logout(request):
    """Выход из Google аккаунта"""
    try:
        # Выполняем выход из Django сессии
        from django.contrib.auth import logout
        logout(request)
        
        return Response({
            'success': True,
            'message': 'Успешный выход из аккаунта'
        })
        
    except Exception as e:
        logger.error(f"Google Logout Error: {str(e)}")
        return Response({
            'success': False,
            'error': 'Ошибка при выходе из аккаунта'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def user_auth_status(request):
    """Проверка статуса авторизации пользователя"""
    try:
        if request.user.is_authenticated:
            # Получаем или создаем профиль пользователя
            profile, created = UserProfile.objects.get_or_create(
                user=request.user,
                defaults={
                    'display_name': request.user.first_name + ' ' + request.user.last_name if request.user.first_name else request.user.username
                }
            )
            
            return Response({
                'authenticated': True,
                'user': {
                    'username': request.user.username,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                },
                'profile': {
                    'google_id': profile.google_id,
                    'google_picture': profile.google_picture,
                    'display_name': profile.display_name,
                }
            })
        else:
            return Response({
                'authenticated': False
            })
            
    except Exception as e:
        logger.error(f"User Auth Status Error: {str(e)}")
        return Response({
            'authenticated': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_all_chats(request):
    """Удалить все чаты пользователя"""
    try:
        session_id = request.session.get('session_id')
        if not session_id:
            return Response({
                'success': False,
                'error': 'Сессия не найдена'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Получаем все чаты пользователя
        user_chats = ChatSession.objects.filter(session_id=session_id)
        chats_count = user_chats.count()
        
        # Удаляем все сообщения и чаты
        for chat in user_chats:
            chat.messages.all().delete()  # Удаляем все сообщения
        user_chats.delete()  # Удаляем все чаты
        
        logger.info(f"Deleted {chats_count} chats for session {session_id}")
        
        return Response({
            'success': True,
            'message': f'Удалено {chats_count} чатов',
            'deleted_chats': chats_count
        })
        
    except Exception as e:
        logger.error(f"Delete all chats error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_account(request):
    """Удалить аккаунт пользователя"""
    try:
        session_id = request.session.get('session_id')
        if not session_id:
            return Response({
                'success': False,
                'error': 'Сессия не найдена'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Получаем профиль пользователя
        try:
            user_profile = UserProfile.objects.get(session_id=session_id)
        except UserProfile.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Профиль пользователя не найден'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Удаляем все чаты пользователя
        user_chats = ChatSession.objects.filter(session_id=session_id)
        chats_count = user_chats.count()
        
        for chat in user_chats:
            chat.messages.all().delete()
        user_chats.delete()
        
        # Удаляем статистику
        UserStatistics.objects.filter(session_id=session_id).delete()
        
        # Удаляем профиль пользователя
        user_email = user_profile.email
        user_profile.delete()
        
        # Очищаем сессию
        request.session.flush()
        
        logger.info(f"Deleted account for session {session_id}, email: {user_email}")
        
        return Response({
            'success': True,
            'message': 'Аккаунт успешно удален',
            'deleted_chats': chats_count,
            'deleted_email': user_email
        })
        
    except Exception as e:
        logger.error(f"Delete account error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Notion Integration Views
@api_view(['POST'])
def test_notion_connection(request):
    """Тестирование подключения к Notion API"""
    try:
        from .notion_service import NotionService
        
        api_key = request.data.get('api_key')
        if not api_key:
            return Response({
                'success': False,
                'error': 'API ключ не предоставлен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notion_service = NotionService(api_key, use_proxy=True)
        result = notion_service.test_connection()
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Notion connection test error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Ошибка тестирования: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def save_notion_settings(request):
    """Сохранение настроек Notion интеграции"""
    try:
        from .models import NotionIntegration
        
        # Получаем данные
        api_key = request.data.get('api_key')
        is_enabled = request.data.get('is_enabled', False)
        selected_page_id = request.data.get('selected_page_id')
        selected_page_title = request.data.get('selected_page_title')
        
        if not api_key:
            return Response({
                'success': False,
                'error': 'API ключ обязателен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Получаем или создаем пользователя
        session_id = request.session.get('session_id')
        if not session_id:
            return Response({
                'success': False,
                'error': 'Сессия не найдена'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Создаем временного пользователя на основе сессии
        user, created = User.objects.get_or_create(
            username=f"session_{session_id}",
            defaults={'email': f"{session_id}@temp.local"}
        )
        
        # Получаем или создаем интеграцию
        integration, created = NotionIntegration.objects.get_or_create(
            user=user,
            defaults={
                'api_key': api_key,
                'is_enabled': is_enabled,
                'selected_page_id': selected_page_id,
                'selected_page_title': selected_page_title
            }
        )
        
        if not created:
            # Обновляем существующую интеграцию
            integration.api_key = api_key
            integration.is_enabled = is_enabled
            if selected_page_id:
                integration.selected_page_id = selected_page_id
                integration.selected_page_title = selected_page_title
            integration.save()
        
        return Response({
            'success': True,
            'message': 'Настройки Notion сохранены'
        })
        
    except Exception as e:
        logger.error(f"Save Notion settings error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Ошибка сохранения: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_notion_settings(request):
    """Получение настроек Notion интеграции"""
    try:
        from .models import NotionIntegration
        
        session_id = request.session.get('session_id')
        if not session_id:
            return Response({
                'is_enabled': False,
                'has_api_key': False
            })
        
        try:
            user = User.objects.get(username=f"session_{session_id}")
            integration = NotionIntegration.objects.get(user=user)
            
            return Response({
                'is_enabled': integration.is_enabled,
                'has_api_key': bool(integration.api_key),
                'total_saves': integration.total_saves,
                'last_save_date': integration.last_save_date
            })
            
        except (User.DoesNotExist, NotionIntegration.DoesNotExist):
            return Response({
                'is_enabled': False,
                'has_api_key': False
            })
        
    except Exception as e:
        logger.error(f"Get Notion settings error: {str(e)}")
        return Response({
            'is_enabled': False,
            'has_api_key': False,
            'error': str(e)
        })

@api_view(['POST'])
def save_to_notion(request):
    """Сохранение сообщения в Notion"""
    try:
        from .models import NotionIntegration, ChatMessage
        from .notion_service import NotionService
        
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({
                'success': False,
                'error': 'ID сообщения не предоставлен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = request.session.get('session_id')
        if not session_id:
            return Response({
                'success': False,
                'error': 'Сессия не найдена'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Получаем пользователя и интеграцию
        try:
            user = User.objects.get(username=f"session_{session_id}")
            integration = NotionIntegration.objects.get(user=user, is_enabled=True)
        except (User.DoesNotExist, NotionIntegration.DoesNotExist):
            return Response({
                'success': False,
                'error': 'Интеграция с Notion не настроена или отключена'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Получаем сообщение
        try:
            message = ChatMessage.objects.get(id=message_id)
        except ChatMessage.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Сообщение не найдено'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Проверяем, что это ответ ИИ
        if message.message_type != 'assistant':
            return Response({
                'success': False,
                'error': 'Можно сохранять только ответы ИИ'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Создаем сервис Notion и сохраняем
        notion_service = NotionService(integration.api_key, use_proxy=True)
        success = notion_service.save_message_to_notion(integration, message)
        
        if success:
            return Response({
                'success': True,
                'message': 'Сообщение успешно сохранено в Notion'
            })
        else:
            return Response({
                'success': False,
                'error': 'Не удалось сохранить сообщение в Notion'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Save to Notion error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Ошибка сохранения: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def get_notion_pages(request):
    """Получение доступных страниц Notion"""
    try:
        from .notion_service import NotionService
        
        api_key = request.data.get('api_key')
        if not api_key:
            return Response({
                'success': False,
                'error': 'API ключ не предоставлен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        notion_service = NotionService(api_key, use_proxy=True)
        result = notion_service.get_available_pages()
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Get Notion pages error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Ошибка получения страниц: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST']) 
def select_notion_page(request):
    """Выбор страницы Notion для сохранения"""
    try:
        from .models import NotionIntegration
        
        page_id = request.data.get('page_id')
        page_title = request.data.get('page_title', '')
        
        if not page_id:
            return Response({
                'success': False,
                'error': 'ID страницы не предоставлен'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = request.session.get('session_id')
        if not session_id:
            return Response({
                'success': False,
                'error': 'Сессия не найдена'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Получаем пользователя и интеграцию
        try:
            user = User.objects.get(username=f"session_{session_id}")
            integration = NotionIntegration.objects.get(user=user)
            
            # Сохраняем выбранную страницу
            integration.selected_page_id = page_id
            integration.selected_page_title = page_title
            integration.save()
            
            return Response({
                'success': True,
                'message': f'Страница "{page_title}" выбрана для сохранения'
            })
            
        except (User.DoesNotExist, NotionIntegration.DoesNotExist):
            return Response({
                'success': False,
                'error': 'Интеграция с Notion не найдена'
            }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"Select Notion page error: {str(e)}")
        return Response({
            'success': False,
            'error': f'Ошибка выбора страницы: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_message_to_notion_view(request):
    """View для сохранения сообщения в Notion"""
    import json
    
    try:
        data = json.loads(request.body)
        content = data.get('content')
        message_id = data.get('message_id')
        
        if not content:
            return JsonResponse({
                'success': False,
                'error': 'Контент сообщения обязателен'
            })
        
        # Получаем настройки Notion для текущей сессии
        session_id = request.session.get('session_id')
        if not session_id:
            return JsonResponse({
                'success': False,
                'error': 'Сессия не найдена'
            })
        
        try:
            from .models import NotionIntegration
            from django.contrib.auth.models import User
            
            # Ищем пользователя по сессии (для анонимных пользователей используем username = session_{session_id})
            try:
                user = User.objects.get(username=f"session_{session_id}")
            except User.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Настройки Notion не найдены. Пожалуйста, настройте интеграцию в настройках.'
                })
            
            # Получаем настройки Notion
            try:
                notion_integration = NotionIntegration.objects.get(user=user)
            except NotionIntegration.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Интеграция с Notion не настроена. Пожалуйста, настройте её в настройках.'
                })
            
            if not notion_integration.is_enabled:
                return JsonResponse({
                    'success': False,
                    'error': 'Интеграция с Notion отключена'
                })
            
            # Используем NotionService для сохранения
            from .notion_service import NotionService
            
            notion_service = NotionService(notion_integration.api_key, use_proxy=True)
            
            # Создаём временное сообщение для сохранения
            from .models import ChatMessage
            from datetime import datetime
            import uuid
            
            # Создаём временное сообщение если message_id не предоставлен
            if message_id:
                try:
                    message = ChatMessage.objects.get(id=message_id)
                except ChatMessage.DoesNotExist:
                    # Создаём временное сообщение
                    message = ChatMessage(
                        id=message_id,
                        content=content,
                        message_type='assistant',
                        created_at=datetime.now()
                    )
            else:
                # Создаём временное сообщение
                message = ChatMessage(
                    id=str(uuid.uuid4()),
                    content=content,
                    message_type='assistant',
                    created_at=datetime.now()
                )
            
            # Сохраняем сообщение в Notion
            result = notion_service.save_message_to_notion(notion_integration, message)
            
            if result:
                return JsonResponse({
                    'success': True,
                    'message': 'Сообщение успешно сохранено в Notion'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Ошибка сохранения в Notion'
                })
                
        except Exception as e:
            logger.error(f"Error saving message to Notion: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': f'Ошибка сохранения: {str(e)}'
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Некорректный JSON'
        })
    except Exception as e:
        logger.error(f"Save message to Notion error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Ошибка сервера: {str(e)}'
        })

