from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Создаем роутер для ViewSets
router = DefaultRouter()
router.register(r'sessions', views.ChatSessionViewSet, basename='sessions')
router.register(r'messages', views.ChatMessageViewSet, basename='messages')
router.register(r'profiles', views.UserProfileViewSet, basename='profiles')
router.register(r'templates', views.ChatTemplateViewSet, basename='templates')

urlpatterns = [
    # Главная страница
    path('', views.IndexView.as_view(), name='index'),
    
    # API роуты
    path('api/', include(router.urls)),
    
    # Основные API эндпоинты
    path('api/chat/', views.chat_message, name='chat_message'),
    path('api/generate-image/', views.generate_image, name='generate_image'),
    path('api/providers/', views.provider_info, name='provider_info'),
    path('api/providers/change/', views.change_provider, name='change_provider'),
    
    # Пользовательские функции
    path('api/user/stats/', views.user_statistics, name='user_statistics'),
    path('api/user/auth-status/', views.user_auth_status, name='user_auth_status'),
    path('api/export/', views.export_chat, name='export_chat'),
    path('api/clear-all/', views.clear_all_chats, name='clear_all_chats'),
    
    # Управление данными
    path('api/delete-all-chats/', views.delete_all_chats, name='delete_all_chats'),
    path('api/delete-account/', views.delete_account, name='delete_account'),
    
    # Notion Integration
    path('api/notion/test/', views.test_notion_connection, name='test_notion_connection'),
    path('api/notion/settings/', views.save_notion_settings, name='save_notion_settings'),
    path('api/notion/settings/get/', views.get_notion_settings, name='get_notion_settings'),
    path('api/notion/pages/', views.get_notion_pages, name='get_notion_pages'),
    path('api/notion/pages/select/', views.select_notion_page, name='select_notion_page'),
    path('api/notion/save/', views.save_to_notion, name='save_to_notion'),
    path('api/notion/save-message/', views.save_message_to_notion_view, name='save_message_to_notion'),
    path('save-to-notion/', views.save_message_to_notion_view, name='save_message_to_notion_legacy'),
    
    # Google OAuth
    path('auth/google/', views.google_auth_init, name='google_auth_init'),
    path('auth/google/callback/', views.google_auth_callback, name='google_auth_callback'),
    path('auth/google/logout/', views.google_logout, name='google_logout'),
    path('api/auth/status/', views.user_auth_status, name='user_auth_status'),
]
