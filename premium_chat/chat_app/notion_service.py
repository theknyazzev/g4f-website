import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional, List
from django.conf import settings
from .models import NotionIntegration, NotionSave, ChatMessage

logger = logging.getLogger(__name__)

# Настройки прокси (можно вынести в settings.py)
PROXY_SETTINGS = {
    'http': 'http://log:pass@ip:port',
    'https': 'http://log:pass@ip:port'
}

class NotionService:
    """Сервис для работы с Notion API через прокси"""
    
    def __init__(self, api_key: str, use_proxy: bool = True):
        self.api_key = api_key
        self.use_proxy = use_proxy
        
        # Всегда используем requests для единообразия
        self.session = requests.Session()
        
        if use_proxy:
            self.session.proxies = PROXY_SETTINGS
            
        self.base_url = "https://api.notion.com/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }
    
    def test_connection(self) -> Dict[str, Any]:
        """Тестирование соединения с Notion API"""
        try:
            # Используем requests
            response = self.session.get(
                f"{self.base_url}/users/me",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "success": True,
                    "message": "Подключение успешно!",
                    "user": user_data.get("name", "Неизвестный пользователь")
                }
            else:
                return {
                    "success": False,
                    "message": f"HTTP {response.status_code}",
                    "error": response.text
                }
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "message": "Ошибка сети",
                "error": str(e)
            }
        except Exception as e:
            # Обработка ошибок API для совместимости
            error_text = str(e)
            
            if "unauthorized" in error_text.lower() or "restricted from accessing" in error_text:
                if "restricted from accessing" in error_text:
                    return {
                        "success": False,
                        "message": "Аккаунт ограничен",
                        "error": "Ваш аккаунт Notion не поддерживает API интеграции.\n\n" +
                                "Возможные причины:\n" +
                                "• Бесплатный аккаунт без прав API\n" +
                                "• Корпоративные ограничения\n" +
                                "• Нужны права Admin/Owner в workspace\n\n" +
                                "Решение: Обратитесь к администратору workspace или обновите план."
                    }
                elif "integration_token" in error_text or "unauthorized" in error_text.lower():
                    return {
                        "success": False,
                        "message": "Проблема с интеграцией",
                        "error": "Интеграция не добавлена к странице!\n\n" +
                                "Обязательные шаги:\n" +
                                "1. Откройте страницу в Notion\n" +
                                "2. Нажмите '...' → 'Add connections'\n" +
                                "3. Выберите вашу интеграцию\n" +
                                "4. Только после этого API будет работать!"
                    }
                else:
                    return {
                        "success": False,
                        "message": "Неверный API ключ",
                        "error": "Проверьте правильность введенного Internal Integration Token"
                    }
            else:
                logger.error(f"Ошибка подключения к Notion API: {e}")
                return {
                    "success": False,
                    "message": "Ошибка соединения с Notion",
                    "error": str(e)
                }
    
    def get_available_pages(self) -> Dict[str, Any]:
        """Получение доступных страниц"""
        try:
            # Используем requests для поиска страниц
            response = self.session.post(
                f"{self.base_url}/search",
                json={
                    "filter": {
                        "value": "page",
                        "property": "object"
                    },
                    "page_size": 100
                },
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                pages = []
                
                for result in data.get("results", []):
                    if result.get("object") == "page":
                        title = "Без названия"
                        
                        # Извлекаем название страницы
                        properties = result.get("properties", {})
                        if "title" in properties:
                            title_data = properties["title"]
                            if title_data.get("title") and len(title_data["title"]) > 0:
                                title = title_data["title"][0]["text"]["content"]
                        elif "Name" in properties:
                            name_data = properties["Name"]
                            if name_data.get("title") and len(name_data["title"]) > 0:
                                title = name_data["title"][0]["text"]["content"]
                        
                        pages.append({
                            "id": result["id"],
                            "title": title,
                            "url": result.get("url", ""),
                            "last_edited": result.get("last_edited_time", "")
                        })
                
                return {
                    "success": True,
                    "pages": pages,
                    "total": len(pages)
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Ошибка получения страниц: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def markdown_to_notion_blocks(self, markdown_text: str) -> List[Dict[str, Any]]:
        """Конвертация markdown в блоки Notion"""
        blocks = []
        lines = markdown_text.split('\n')
        
        current_code_block = None
        current_list_items = []
        
        for line in lines:
            line = line.strip()
            
            if not line:
                if current_code_block:
                    continue
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": []
                    }
                })
                continue
            
            # Обработка блоков кода
            if line.startswith('```'):
                if current_code_block is None:
                    # Начало блока кода
                    language = line[3:].strip() or "plain text"
                    current_code_block = {
                        "object": "block",
                        "type": "code",
                        "code": {
                            "language": language.lower(),
                            "rich_text": []
                        }
                    }
                else:
                    # Конец блока кода
                    blocks.append(current_code_block)
                    current_code_block = None
                continue
            
            if current_code_block:
                # Внутри блока кода
                if current_code_block["code"]["rich_text"]:
                    current_code_block["code"]["rich_text"].append({
                        "type": "text",
                        "text": {"content": "\n"}
                    })
                current_code_block["code"]["rich_text"].append({
                    "type": "text",
                    "text": {"content": line}
                })
                continue
            
            # Заголовки
            if line.startswith('#'):
                heading_level = len(line) - len(line.lstrip('#'))
                heading_text = line.lstrip('#').strip()
                
                if heading_level == 1:
                    block_type = "heading_1"
                elif heading_level == 2:
                    block_type = "heading_2"
                else:
                    block_type = "heading_3"
                
                blocks.append({
                    "object": "block",
                    "type": block_type,
                    block_type: {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": heading_text}
                        }]
                    }
                })
                continue
            
            # Списки
            if line.startswith('- ') or line.startswith('* '):
                list_text = line[2:].strip()
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": list_text}
                        }]
                    }
                })
                continue
            
            # Нумерованные списки
            if line and line[0].isdigit() and '. ' in line:
                list_text = line.split('. ', 1)[1].strip()
                blocks.append({
                    "object": "block",
                    "type": "numbered_list_item",
                    "numbered_list_item": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": list_text}
                        }]
                    }
                })
                continue
            
            # Цитаты
            if line.startswith('>'):
                quote_text = line[1:].strip()
                blocks.append({
                    "object": "block",
                    "type": "quote",
                    "quote": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": quote_text}
                        }]
                    }
                })
                continue
            
            # Обычный параграф
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": self._parse_rich_text(line)
                }
            })
        
        # Закрываем незакрытый блок кода
        if current_code_block:
            blocks.append(current_code_block)
        
        return blocks
    
    def _parse_rich_text(self, text: str) -> List[Dict[str, Any]]:
        """Парсинг форматированного текста"""
        # Простая реализация без сложного парсинга markdown
        # В будущем можно расширить для поддержки **bold**, *italic*, `code` и т.д.
        return [{
            "type": "text",
            "text": {"content": text}
        }]
    
    def save_message_to_notion(self, integration: NotionIntegration, message: ChatMessage) -> bool:
        """Сохранение сообщения в Notion - добавляет к выбранной странице"""
        try:
            # Подготавливаем блоки для сохранения
            blocks = []
            
            # Добавляем заголовок с метаданными
            timestamp = message.created_at.strftime("%Y-%m-%d %H:%M")
            title = f"AI Response - {timestamp}"
            
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": title}
                    }]
                }
            })
            
            # Добавляем метаданные если включено
            if hasattr(integration, 'include_metadata') and integration.include_metadata:
                metadata_text = f"**Модель:** {message.model_used or 'Неизвестно'}\n"
                metadata_text += f"**Провайдер:** {message.provider_used or 'Неизвестно'}\n"
                if hasattr(message, 'response_time') and message.response_time:
                    metadata_text += f"**Время ответа:** {message.response_time:.2f}с\n"
                
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": metadata_text}
                        }]
                    }
                })
            
            # Добавляем разделитель
            blocks.append({
                "object": "block",
                "type": "divider",
                "divider": {}
            })
            
            # Конвертируем содержимое сообщения в блоки Notion
            content_blocks = self.markdown_to_notion_blocks(message.content)
            blocks.extend(content_blocks)
            
            # Добавляем блоки к выбранной странице
            page_id = getattr(integration, 'selected_page_id', None)
            
            if page_id:
                # Добавляем к существующей странице
                response = self.session.patch(
                    f"{self.base_url}/blocks/{page_id}/children",
                    json={"children": blocks},
                    headers=self.headers,
                    timeout=15
                )
                success = response.status_code == 200
            else:
                # Создаем новую страницу если не выбрана
                success = self._create_new_page(blocks, title)
            
            if success:
                # Сохраняем запись о успешном сохранении
                NotionSave.objects.create(
                    integration=integration,
                    message=message,
                    notion_page_id=page_id or "new_page",
                    is_successful=True
                )
                
                # Обновляем статистику
                integration.total_saves += 1
                integration.last_save_date = datetime.now()
                integration.save()
                
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"Ошибка при сохранении сообщения в Notion: {e}")
            
            # Сохраняем запись об ошибке
            NotionSave.objects.create(
                integration=integration,
                message=message,
                notion_page_id="",
                is_successful=False,
                error_message=str(e)
            )
            return False
    
    def _create_new_page(self, blocks: List[Dict], title: str) -> bool:
        """Создание новой страницы"""
        try:
            # Используем requests
            page_data = {
                "properties": {
                    "title": {
                        "title": [
                            {
                                "type": "text",
                                "text": {"content": title}
                            }
                        ]
                    }
                },
                "icon": {
                    "type": "emoji",
                    "emoji": "💬"
                },
                "children": blocks
            }
            
            response = self.session.post(
                f"{self.base_url}/pages",
                json=page_data,
                headers=self.headers,
                timeout=15
            )
            return response.status_code == 200
                    
        except Exception as e:
            logger.error(f"Ошибка создания новой страницы: {e}")
            return False

def get_notion_service(user, use_proxy: bool = True) -> Optional[NotionService]:
    """Получение сервиса Notion для пользователя"""
    try:
        integration = NotionIntegration.objects.get(user=user, is_enabled=True)
        return NotionService(integration.api_key, use_proxy=use_proxy)
    except NotionIntegration.DoesNotExist:
        return None
