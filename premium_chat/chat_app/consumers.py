import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import ChatSession, ChatMessage
from .gpt_service import gpt_service

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer для чата"""
    
    async def connect(self):
        """Подключение к WebSocket"""
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'
        
        # Присоединяемся к группе
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"WebSocket connected for session {self.session_id}")
    
    async def disconnect(self, close_code):
        """Отключение от WebSocket"""
        # Покидаем группу
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected for session {self.session_id}")
    
    async def receive(self, text_data):
        """Получение сообщения от клиента"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'chat_message')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(text_data_json)
            elif message_type == 'typing_start':
                await self.handle_typing_start()
            elif message_type == 'typing_stop':
                await self.handle_typing_stop()
            
        except json.JSONDecodeError:
            await self.send_error("Неверный формат JSON")
        except Exception as e:
            logger.error(f"Ошибка в receive: {str(e)}")
            await self.send_error("Внутренняя ошибка сервера")
    
    async def handle_chat_message(self, data):
        """Обработка сообщения чата"""
        message = data.get('message', '').strip()
        if not message:
            await self.send_error("Пустое сообщение")
            return
        
        try:
            # Получаем или создаем сессию
            session = await self.get_or_create_session()
            
            # Сохраняем пользовательское сообщение
            user_message = await self.save_message(session, 'user', message)
            
            # Отправляем пользовательское сообщение всем в группе
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_message',
                    'message': {
                        'id': str(user_message.id),
                        'type': 'user',
                        'content': message,
                        'timestamp': user_message.created_at.isoformat()
                    }
                }
            )
            
            # Показываем индикатор печати
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ai_typing_start'
                }
            )
            
            # Получаем историю разговора
            conversation_history = await self.get_conversation_history(session)
            
            # Получаем ответ от GPT асинхронно
            gpt_response = await gpt_service.get_response_async(message, conversation_history)
            
            # Убираем индикатор печати
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ai_typing_stop'
                }
            )
            
            if gpt_response.get('success'):
                # Сохраняем ответ ассистента
                assistant_message = await self.save_message(
                    session, 
                    'assistant', 
                    gpt_response['response'],
                    gpt_response.get('raw_response', ''),
                    gpt_response.get('provider_used', ''),
                    gpt_response.get('model_used', ''),
                    gpt_response.get('response_time'),
                    gpt_response.get('attempt_number')
                )
                
                # Отправляем ответ ассистента
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'ai_message',
                        'message': {
                            'id': str(assistant_message.id),
                            'type': 'assistant',
                            'content': gpt_response['response'],
                            'timestamp': assistant_message.created_at.isoformat(),
                            'provider': gpt_response.get('provider_used', ''),
                            'response_time': gpt_response.get('response_time', 0)
                        }
                    }
                )
            else:
                # Отправляем ошибку
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'ai_error',
                        'error': gpt_response.get('error', 'Неизвестная ошибка'),
                        'response': gpt_response.get('response', 'Извините, произошла ошибка.')
                    }
                )
                
        except Exception as e:
            logger.error(f"Ошибка в handle_chat_message: {str(e)}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ai_error',
                    'error': 'Внутренняя ошибка сервера',
                    'response': 'Извините, произошла внутренняя ошибка. Попробуйте еще раз.'
                }
            )
    
    async def handle_typing_start(self):
        """Обработка начала печати пользователем"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_typing_start'
            }
        )
    
    async def handle_typing_stop(self):
        """Обработка окончания печати пользователем"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_typing_stop'
            }
        )
    
    # Обработчики сообщений от группы
    async def user_message(self, event):
        """Отправка пользовательского сообщения"""
        await self.send(text_data=json.dumps({
            'type': 'user_message',
            'message': event['message']
        }))
    
    async def ai_message(self, event):
        """Отправка сообщения ИИ"""
        await self.send(text_data=json.dumps({
            'type': 'ai_message',
            'message': event['message']
        }))
    
    async def ai_error(self, event):
        """Отправка ошибки ИИ"""
        await self.send(text_data=json.dumps({
            'type': 'ai_error',
            'error': event['error'],
            'response': event['response']
        }))
    
    async def ai_typing_start(self, event):
        """ИИ начал печатать"""
        await self.send(text_data=json.dumps({
            'type': 'ai_typing_start'
        }))
    
    async def ai_typing_stop(self, event):
        """ИИ закончил печатать"""
        await self.send(text_data=json.dumps({
            'type': 'ai_typing_stop'
        }))
    
    async def user_typing_start(self, event):
        """Пользователь начал печатать"""
        await self.send(text_data=json.dumps({
            'type': 'user_typing_start'
        }))
    
    async def user_typing_stop(self, event):
        """Пользователь закончил печатать"""
        await self.send(text_data=json.dumps({
            'type': 'user_typing_stop'
        }))
    
    # Вспомогательные методы
    async def send_error(self, error_message):
        """Отправка ошибки клиенту"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'error': error_message
        }))
    
    @database_sync_to_async
    def get_or_create_session(self):
        """Получить или создать сессию"""
        try:
            session = ChatSession.objects.get(session_id=self.session_id)
        except ChatSession.DoesNotExist:
            user = self.scope["user"] if not isinstance(self.scope["user"], AnonymousUser) else None
            session = ChatSession.objects.create(
                session_id=self.session_id,
                user=user
            )
        return session
    
    @database_sync_to_async
    def save_message(self, session, message_type, content, raw_content='', provider='', model='', response_time=None, attempt_number=None):
        """Сохранить сообщение в базе данных"""
        return ChatMessage.objects.create(
            session=session,
            message_type=message_type,
            content=content,
            raw_content=raw_content,
            provider_used=provider,
            model_used=model,
            response_time=response_time,
            attempt_number=attempt_number
        )
    
    @database_sync_to_async
    def get_conversation_history(self, session, max_messages=50):
        """Получить историю разговора"""
        messages = session.messages.order_by('created_at')[:max_messages * 2]  # x2 для user+assistant пар
        
        history = []
        for msg in messages:
            if msg.message_type == 'user':
                history.append({
                    'message': msg.content,
                    'response': None
                })
            elif msg.message_type == 'assistant' and history:
                history[-1]['response'] = msg.content
        
        return history
