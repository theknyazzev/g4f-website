// Premium ChatGPT App
class PremiumChatApp {
    constructor() {
        this.chats = [];
        this.currentChatId = null;
        this.isTyping = false;
        this.isPaused = false;
        this.currentRequest = null;
        this.pendingMessage = null;
        this.websocket = null;
        this.apiBaseUrl = '/api';
        this.sessionStartTime = Date.now();
        this.currentProvider = null;
        this.currentModel = null;
        this.availableProviders = null;
        this.selectedFile = null;
        this.init();
    }

    // Безопасный fetch с CSRF токеном
    async safeFetch(url, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.csrfToken || ''
        };
        
        const mergedOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };
        
        return fetch(url, mergedOptions);
    }

    // Инициализация приложения
    init() {
        this.loadChatsFromStorage();
        this.setupEventListeners();
        this.initializeSidebar();
        this.setupMobileViewportFix();
        this.loadProviderInfo();
        this.loadSavedModel();
        this.initializeImageModalEvents(); // Добавляем инициализацию модального окна изображений
        this.setupSettingsModal(); // Добавляем инициализацию настроек
        this.checkGoogleAuthResult(); // Проверяем результат Google авторизации
        this.loadUserProfile(); // Загружаем профиль пользователя если авторизован
        this.checkUserAuthStatus(); // Проверяем статус авторизации при загрузке
        this.initializeAppVersion(); // Инициализируем версию приложения
        this.initializeLocalization(); // Инициализируем локализацию
        
        // Загружаем состояние Notion интеграции
        setTimeout(() => {
            if (typeof loadNotionIntegrationState === 'function') {
                loadNotionIntegrationState();
            }
        }, 100);
        
        // Обновляем список чатов в интерфейсе
        this.updateChatList();
        
        // Создаем первый чат, если чатов нет
        if (this.chats.length === 0) {
            this.createNewChat();
        } else {
            this.selectChat(this.chats[0].id);
        }
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Боковое меню
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('mobileSidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('sidebarOverlay').addEventListener('click', () => {
            this.closeMobileSidebar();
        });

        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.createNewChat();
        });

        // Настройка свайпа для мобильных устройств
        this.setupSwipeGestures();

        // Отправка сообщений
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');

        sendButton.addEventListener('click', () => {
            if (this.isTyping && !this.isPaused) {
                // Если идет генерация, приостанавливаем
                this.pauseGeneration();
            } else {
                // Иначе отправляем сообщение
                this.sendMessage();
            }
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    this.sendMessage();
                }
            }
        });

        messageInput.addEventListener('input', () => {
            this.handleInputChange();
        });

        // Автоматическое изменение высоты textarea
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });

        // Примеры промптов
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.getAttribute('data-prompt');
                console.log('Клик по карточке с промптом:', prompt);
                
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.value = prompt;
                    this.handleInputChange();
                    this.autoResizeTextarea(messageInput);
                    messageInput.focus();
                    console.log('Промпт установлен в поле ввода');
                    
                    // Автоматически отправляем сообщение
                    setTimeout(() => {
                        this.sendMessage();
                    }, 100);
                } else {
                    console.error('Поле ввода messageInput не найдено');
                }
            });
        });

        // Действия в хедере чата
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearCurrentChat();
        });

        document.getElementById('exportChatBtn').addEventListener('click', () => {
            this.exportCurrentChat();
        });

        // Селектор модели
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.handleModelChange(e.target.value);
            });
        }

        // Кнопки паузы и продолжения
        document.getElementById('continueGenerationBtn').addEventListener('click', () => {
            this.continueGeneration();
        });

        // Загрузка файлов
        this.setupFileUpload();

        // Модальные окна
        this.setupModalEventListeners();

        // Действия в футере сайдбара
        this.setupSidebarActions();
        
        // Обработчик кликов по изображениям
        this.setupImageClickHandlers();
    }

    setupImageClickHandlers() {
        // Используем делегирование событий для динамически добавляемых изображений
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-image')) {
                e.preventDefault();
                e.stopPropagation();
                const imageSrc = e.target.getAttribute('data-image-src') || e.target.src;
                this.openImageModal(imageSrc);
            }
        });
    }

    setupModalEventListeners() {
        // Переименование чата
        const renameModal = document.getElementById('renameModal');
        const closeRenameModal = document.getElementById('closeRenameModal');
        const cancelRename = document.getElementById('cancelRename');
        const confirmRename = document.getElementById('confirmRename');

        if (closeRenameModal) {
            closeRenameModal.addEventListener('click', () => {
                this.closeModal('renameModal');
            });
        }

        if (cancelRename) {
            cancelRename.addEventListener('click', () => {
                this.closeModal('renameModal');
            });
        }

        if (confirmRename) {
            confirmRename.addEventListener('click', () => {
                this.confirmChatRename();
            });
        }

        // Статистика
        const statsModal = document.getElementById('statsModal');
        const closeStatsModal = document.getElementById('closeStatsModal');
        const closeStats = document.getElementById('closeStats');

        if (closeStatsModal) {
            closeStatsModal.addEventListener('click', () => {
                this.closeModal('statsModal');
            });
        }

        if (closeStats) {
            closeStats.addEventListener('click', () => {
                this.closeModal('statsModal');
            });
        }

        // Модальное окно достижения
        const closeAchievementModal = document.getElementById('closeAchievementModal');
        const closeAchievement = document.getElementById('closeAchievement');

        if (closeAchievementModal) {
            closeAchievementModal.addEventListener('click', () => {
                this.closeModal('achievementModal');
            });
        }

        if (closeAchievement) {
            closeAchievement.addEventListener('click', () => {
                this.closeModal('achievementModal');
            });
        }

        // Закрытие модальных окон по клику на фон
        this.setupModalBackgroundClose();

        // Мобильное контекстное меню
        this.setupMobileContextMenu();
    }

    setupSidebarActions() {
        const sidebarActions = document.querySelectorAll('.action-btn');
        sidebarActions.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                switch(index) {
                    case 0: // Настройки
                        this.showSettings();
                        break;
                    case 1: // Экспорт чатов
                        this.exportAllChats();
                        break;
                    case 2: // Очистить все
                        this.clearAllChats();
                        break;
                }
            });
        });

        // Обработчик для профиля пользователя (только область с именем и аватаром)
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.addEventListener('click', () => {
                this.showUserProfile();
            });
        }

        // Обработчик для кнопки настроек (три точки)
        const settingsBtn = document.getElementById('settingsMenuBtn');
        console.log('Settings button found:', settingsBtn);
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                console.log('Settings button clicked!');
                e.stopPropagation(); // Предотвращаем всплытие события
                this.openSettingsModal();
            });
        } else {
            console.error('Settings button NOT found!');
        }
    }

    setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const removeFileBtn = document.getElementById('removeFile');
        
        // Новая система с выпадающим меню
        this.setupImageActionsDropdown();

        // Обработка выбора файла
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelect(file);
            }
        });

        // Удаление выбранного файла
        removeFileBtn.addEventListener('click', () => {
            this.removeSelectedFile();
        });

        // Drag and drop
        const inputWrapper = document.querySelector('.input-wrapper');
        inputWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            inputWrapper.style.backgroundColor = '#343541';
        });

        inputWrapper.addEventListener('dragleave', (e) => {
            e.preventDefault();
            inputWrapper.style.backgroundColor = '#2d2d2d';
        });

        inputWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            inputWrapper.style.backgroundColor = '#2d2d2d';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.handleFileSelect(files[0]);
            }
        });
    }

    setupImageActionsDropdown() {
        const imageActionsButton = document.getElementById('imageActionsButton');
        const imageActionsMenu = document.getElementById('imageActionsMenu');
        const uploadImageAction = document.getElementById('uploadImageAction');
        const generateImageAction = document.getElementById('generateImageAction');
        const fileInput = document.getElementById('fileInput');

        // Переключение выпадающего меню
        imageActionsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = imageActionsMenu.classList.contains('show');
            
            if (isOpen) {
                this.closeImageActionsMenu();
            } else {
                this.openImageActionsMenu();
            }
        });

        // Загрузка изображения
        uploadImageAction.addEventListener('click', () => {
            fileInput.click();
            this.closeImageActionsMenu();
        });

        // Генерация изображения
        generateImageAction.addEventListener('click', () => {
            this.showImageGenerationPrompt();
            this.closeImageActionsMenu();
        });

        // Закрытие меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!imageActionsButton.contains(e.target) && !imageActionsMenu.contains(e.target)) {
                this.closeImageActionsMenu();
            }
        });

        // Закрытие меню при нажатии Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeImageActionsMenu();
            }
        });
    }

    openImageActionsMenu() {
        const imageActionsButton = document.getElementById('imageActionsButton');
        const imageActionsMenu = document.getElementById('imageActionsMenu');
        
        // Определяем, достаточно ли места внизу для открытия меню
        const buttonRect = imageActionsButton.getBoundingClientRect();
        const menuHeight = 80; // Примерная высота меню с двумя элементами
        const menuWidth = 180; // Минимальная ширина меню
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const spaceRight = viewportWidth - buttonRect.left;
        
        // Если места внизу мало, но вверху достаточно - открываем вверх
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            imageActionsMenu.classList.add('open-upward');
        } else {
            imageActionsMenu.classList.remove('open-upward');
        }
        
        // Если места справа недостаточно - выравниваем по правому краю
        if (spaceRight < menuWidth) {
            imageActionsMenu.classList.add('align-right');
        } else {
            imageActionsMenu.classList.remove('align-right');
        }
        
        imageActionsButton.classList.add('active');
        imageActionsMenu.classList.add('show');
    }

    closeImageActionsMenu() {
        const imageActionsButton = document.getElementById('imageActionsButton');
        const imageActionsMenu = document.getElementById('imageActionsMenu');
        
        imageActionsButton.classList.remove('active');
        imageActionsMenu.classList.remove('show');
        imageActionsMenu.classList.remove('open-upward');
        imageActionsMenu.classList.remove('align-right');
    }

    setupMobileContextMenu() {
        const contextMenu = document.getElementById('mobileContextMenu');
        const contextRename = document.getElementById('contextRename');
        const contextDelete = document.getElementById('contextDelete');

        if (contextRename) {
            contextRename.addEventListener('click', () => {
                this.hideMobileContextMenu();
                if (this.contextMenuTarget) {
                    this.renameChatById(this.contextMenuTarget);
                }
            });
        }

        if (contextDelete) {
            contextDelete.addEventListener('click', () => {
                this.hideMobileContextMenu();
                if (this.contextMenuTarget) {
                    this.deleteChatById(this.contextMenuTarget);
                }
            });
        }

        // Закрытие контекстного меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideMobileContextMenu();
            }
        });
    }

    // Настройка закрытия модальных окон по клику на фон
    setupModalBackgroundClose() {
        // Получаем все модальные окна
        const modalOverlays = document.querySelectorAll('.modal-overlay');
        
        modalOverlays.forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                // Проверяем, что клик был именно по overlay, а не по содержимому модального окна
                if (e.target === overlay) {
                    // Определяем ID модального окна и закрываем его
                    const modalId = overlay.id;
                    
                    // Специальная обработка для разных модальных окон
                    if (modalId === 'imageModal') {
                        this.closeImageModal();
                    } else if (modalId === 'serviceAgreementModal') {
                        this.closeServiceAgreementModal();
                    } else if (modalId === 'termsOfServiceModal') {
                        this.closeTermsOfServiceModal();
                    } else if (modalId === 'privacyPolicyModal') {
                        this.closePrivacyPolicyModal();
                    } else {
                        this.closeModal(modalId);
                    }
                }
            });
        });
    }

    // Создание нового чата
    async createNewChat() {
        const chatId = this.generateChatId();
        const newChat = {
            id: chatId,
            session_id: chatId,
            title: 'Новый чат',
            messages: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.chats.unshift(newChat);
        this.selectChat(chatId);
        this.updateChatList();
        this.saveChatsToStorage();
        
        // Отправляем на сервер для сохранения
        try {
            const response = await this.safeFetch(`${this.apiBaseUrl}/sessions/`, {
                method: 'POST',
                body: JSON.stringify({
                    session_id: chatId,
                    title: newChat.title
                })
            });
        } catch (error) {
            console.warn('Ошибка при создании сессии на сервере:', error);
        }
    }

    // Отправка сообщения
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        // Проверяем есть ли текст или файл
        if ((!message && !this.selectedFile) || this.isTyping) {
            return;
        }

        // Скрываем кнопку "Продолжить генерацию" при отправке нового сообщения
        this.hideContinueSection();

        const currentChat = this.getCurrentChat();
        if (!currentChat) {
            console.error('Нет активного чата');
            return;
        }

        // Получаем base64 изображения если есть файл
        let imageData = null;
        if (this.selectedFile) {
            imageData = await this.uploadFileToBase64();
        }

        // Очищаем поле ввода и файл
        messageInput.value = '';
        this.handleInputChange();
        this.resetTextareaHeight(messageInput);

        // Добавляем сообщение пользователя
        const userMessage = {
            id: this.generateMessageId(),
            type: 'user',
            content: message || 'Изображение',
            timestamp: new Date().toISOString(),
            image: imageData,
            fileName: this.selectedFile ? this.selectedFile.name : null
        };

        this.addMessageToChat(currentChat.id, userMessage);
        this.renderMessage(userMessage);
        this.hideWelcomeScreen();

        // Удаляем выбранный файл после отправки
        if (this.selectedFile) {
            this.removeSelectedFile();
        }

        // Обновляем название чата если это первое сообщение
        if (currentChat.messages.length === 1) {
            currentChat.title = message.length > 50 ? message.substring(0, 50) + '...' : message;
            this.updateChatList();
            this.updateChatTitle(currentChat.title);
        }

        // Показываем индикатор печати и переключаем кнопку в режим паузы
        this.showTypingIndicator();
        this.isTyping = true;
        this.isPaused = false;
        this.handleInputChange(); // Это переключит кнопку в режим паузы

        try {
            // Определяем параметры для отправки
            let requestParams = {
                message: message || 'Изображение',
                session_id: currentChat.session_id,
                include_history: true,
                max_history: 50
            };

            // Добавляем изображение если есть
            if (imageData) {
                requestParams.image_data = imageData;
                requestParams.image_filename = this.selectedFile ? this.selectedFile.name : 'image.jpg';
            }

            // Если выбрана конкретная модель, передаем её и список провайдеров
            if (this.currentModel && this.availableProviders) {
                requestParams.model = this.currentModel;
                requestParams.providers = this.availableProviders;
                requestParams.provider = this.currentProvider;
            }

            // Создаем контроллер для возможности отмены запроса
            const controller = new AbortController();
            this.currentRequest = controller;

            // Отправляем сообщение на сервер
            const response = await this.safeFetch(`${this.apiBaseUrl}/chat/`, {
                method: 'POST',
                body: JSON.stringify(requestParams),
                signal: controller.signal
            });

            // Проверяем, не была ли генерация приостановлена
            if (this.isPaused) {
                // Создаем пустое сообщение ассистента и показываем кнопку продолжения
                const pausedMessage = {
                    id: this.generateMessageId(),
                    type: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isPaused: true
                };

                this.pendingMessage = pausedMessage;
                this.addMessageToChat(currentChat.id, pausedMessage);
                this.renderPausedMessage(pausedMessage);
                this.showContinueSection();
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Добавляем ответ ассистента
                const assistantMessage = {
                    id: data.message_id || this.generateMessageId(),
                    type: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString(),
                    provider: data.provider_used,
                    response_time: data.response_time
                };

                this.addMessageToChat(currentChat.id, assistantMessage);
                this.renderMessage(assistantMessage);
                
                // Обновляем текущий провайдер если он был изменен на бэкенде
                if (data.provider_used && this.availableProviders && this.availableProviders.includes(data.provider_used)) {
                    this.currentProvider = data.provider_used;
                }
            } else {
                // Если есть доступные провайдеры, попробуем следующий
                if (this.availableProviders && this.availableProviders.length > 1) {
                    const currentIndex = this.availableProviders.indexOf(this.currentProvider);
                    const nextIndex = (currentIndex + 1) % this.availableProviders.length;
                    this.currentProvider = this.availableProviders[nextIndex];
                    
                    console.log(`Переключаемся на следующий провайдер: ${this.currentProvider}`);
                    
                    // Повторяем запрос с новым провайдером
                    // (можно добавить ограничение на количество попыток)
                }
                
                // Показываем ошибку
                const errorMessage = {
                    id: this.generateMessageId(),
                    type: 'system',
                    content: data.response || 'Произошла ошибка при получении ответа',
                    timestamp: new Date().toISOString()
                };

                this.addMessageToChat(currentChat.id, errorMessage);
                this.renderMessage(errorMessage);
            }
        } catch (error) {
            // Проверяем, была ли отмена запроса (пауза)
            if (error.name === 'AbortError') {
                console.log('Запрос был отменен (пауза)');
                return;
            }

            console.error('Ошибка при отправке сообщения:', error);
            
            const errorMessage = {
                id: this.generateMessageId(),
                type: 'system',
                content: 'Ошибка подключения к серверу. Проверьте подключение к интернету.',
                timestamp: new Date().toISOString()
            };

            this.addMessageToChat(currentChat.id, errorMessage);
            this.renderMessage(errorMessage);
        } finally {
            if (!this.isPaused) {
                this.hideTypingIndicator();
                this.isTyping = false;
                this.handleInputChange(); // Переключаем кнопку обратно в режим отправки
                this.hideContinueSection(); // Скрываем кнопку продолжения после завершения генерации
                this.currentRequest = null;
                this.saveChatsToStorage();
            }
        }
    }

    // Рендеринг сообщения
    renderMessage(message) {
        console.log('Rendering message:', message.type, message.id);
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type} message-appear`;
        messageElement.setAttribute('data-message-id', message.id);

        let avatarIcon = '';
        let messageClass = '';
        
        switch (message.type) {
            case 'user':
                avatarIcon = '<i class="fas fa-user"></i>';
                messageClass = 'user';
                break;
            case 'assistant':
                avatarIcon = '<i class="fas fa-robot"></i>';
                messageClass = 'assistant';
                break;
            case 'system':
                avatarIcon = '<i class="fas fa-exclamation-triangle"></i>';
                messageClass = 'assistant';
                break;
        }

        messageElement.innerHTML = `
            <div class="message-avatar">
                ${avatarIcon}
            </div>
            <div class="message-content">
                ${message.image ? `
                    <div class="message-image">
                        <img src="${message.image}" alt="${message.fileName || 'Изображение'}" class="chat-image" data-image-src="${message.image}" style="max-width: 300px; max-height: 300px; border-radius: 8px; cursor: pointer; margin-bottom: 8px;">
                        ${message.fileName ? `<div class="image-filename">${message.fileName}</div>` : ''}
                    </div>
                ` : ''}
                <div class="message-content-text">
                    ${this.formatMessageContent(message.content)}
                </div>
                <div class="message-edit-form">
                    <textarea class="message-edit-textarea" data-message-id="${message.id}">${message.content}</textarea>
                    <div class="message-edit-actions">
                        <button class="message-edit-btn message-edit-cancel">Отмена</button>
                        <button class="message-edit-btn message-edit-save">Сохранить</button>
                    </div>
                </div>
                <div class="message-actions">
                    ${message.type === 'user' ? `
                        <button class="message-action-btn edit-btn" title="Редактировать" data-message-id="${message.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    ${message.type === 'assistant' ? `
                        <button class="save-to-notion-btn" title="Сохранить в Notion" data-message-id="${message.id}">
                            <span class="notion-logo"></span>
                        </button>
                    ` : ''}
                    <button class="message-action-btn" title="Копировать">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="message-action-btn" title="В избранное">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `;

        // Добавляем обработчики для кнопок действий
        const editBtn = messageElement.querySelector('.edit-btn');
        const copyBtn = messageElement.querySelector('.message-action-btn[title="Копировать"]');
        const favoriteBtn = messageElement.querySelector('.message-action-btn[title="В избранное"]');
        const notionBtn = messageElement.querySelector('.save-to-notion-btn');
        const editCancelBtn = messageElement.querySelector('.message-edit-cancel');
        const editSaveBtn = messageElement.querySelector('.message-edit-save');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.startEditMessage(messageElement, message.id);
            });
        }

        if (editCancelBtn) {
            editCancelBtn.addEventListener('click', () => {
                this.cancelEditMessage(messageElement);
            });
        }

        if (editSaveBtn) {
            editSaveBtn.addEventListener('click', () => {
                this.saveEditMessage(messageElement, message.id);
            });
        }

        copyBtn.addEventListener('click', () => {
            this.copyMessageContent(message.content);
        });

        favoriteBtn.addEventListener('click', () => {
            this.toggleMessageFavorite(message.id);
        });

        if (notionBtn) {
            notionBtn.addEventListener('click', () => {
                console.log('Notion button clicked for message:', message.id);
                window.saveMessageToNotion(message.id, message.content, notionBtn);
            });
        }

        // Убрали свайп-жесты для сообщений

        // Добавляем сообщение перед индикатором печати
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && messagesContainer.contains(typingIndicator)) {
            messagesContainer.insertBefore(messageElement, typingIndicator);
        } else {
            messagesContainer.appendChild(messageElement);
        }
        
        // Обновляем кнопки Notion после добавления сообщения
        if (message.type === 'assistant' && typeof updateNotionButtons === 'function') {
            updateNotionButtons();
        }
        
        this.scrollToBottom();
    }

    // Форматирование контента сообщения (расширенный markdown)
    formatMessageContent(content) {
        if (!content) return '';
        
        // Экранируем HTML теги для безопасности
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Форматирование блоков кода (должно быть первым)
        formatted = formatted.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang ? ` class="language-${lang}"` : '';
            return `<div class="code-block"><pre><code${language}>${code.trim()}</code></pre></div>`;
        });

        // Форматирование инлайн кода
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // Форматирование заголовков
        formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Форматирование жирного текста
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Форматирование курсива (исправленные регексы)
        formatted = formatted.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\b_([^_\n]+)_\b/g, '<em>$1</em>');

        // Форматирование зачеркнутого текста
        formatted = formatted.replace(/~~(.*?)~~/g, '<del>$1</del>');

        // Форматирование подчеркнутого текста
        formatted = formatted.replace(/\+\+(.*?)\+\+/g, '<u>$1</u>');

        // Форматирование выделенного текста (маркер)
        formatted = formatted.replace(/==(.*?)==/g, '<mark>$1</mark>');

        // Форматирование верхних и нижних индексов
        formatted = formatted.replace(/\^([^^\s]+)/g, '<sup>$1</sup>');
        formatted = formatted.replace(/~([^~\s]+)/g, '<sub>$1</sub>');

        // Форматирование ссылок
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Форматирование автоматических ссылок
        formatted = formatted.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

        // Форматирование списков
        // Нумерованные списки
        formatted = formatted.replace(/^(\d+\.\s+.*$)/gm, '<li class="numbered-item">$1</li>');
        formatted = formatted.replace(/(<li class="numbered-item">.*<\/li>)/s, '<ol>$1</ol>');

        // Маркированные списки
        formatted = formatted.replace(/^[-*+]\s+(.*$)/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');

        // Форматирование цитат
        formatted = formatted.replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>');

        // Форматирование горизонтальной линии
        formatted = formatted.replace(/^---$/gm, '<hr class="separator">');
        formatted = formatted.replace(/^\*\*\*$/gm, '<hr class="separator">');
        formatted = formatted.replace(/^===$/gm, '<hr class="separator-thick">');
        formatted = formatted.replace(/^\+\+\+$/gm, '<hr class="separator-dashed">');
        formatted = formatted.replace(/^\.\.\.$/gm, '<hr class="separator-dotted">');

        // Форматирование таблиц (базовое)
        const tableRegex = /^\|(.+)\|\s*$\n^\|(-+\|[-|\s]*)\|\s*$\n((?:^\|.+\|\s*$\n?)*)/gm;
        formatted = formatted.replace(tableRegex, (match, header, separator, rows) => {
            const headerCells = header.split('|').map(cell => `<th>${cell.trim()}</th>`).join('');
            const rowsHtml = rows.trim().split('\n').map(row => {
                const cells = row.replace(/^\||\|$/g, '').split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<table class="markdown-table"><thead><tr>${headerCells}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
        });

        // Преобразование переносов строк в <br> (в конце, чтобы не затронуть другие форматирования)
        formatted = formatted.replace(/\n/g, '<br>');

        // Убираем лишние <br> перед блочными элементами
        formatted = formatted.replace(/<br>\s*(<\/?(h[1-6]|ul|ol|li|blockquote|pre|table|div))/g, '$1');
        formatted = formatted.replace(/(<\/?(h[1-6]|ul|ol|li|blockquote|pre|table|div)[^>]*>)\s*<br>/g, '$1');

        return formatted;
    }

    // Показать/скрыть индикатор печати
    showTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        
        if (!indicator) {
            console.error('Элемент typingIndicator не найден!');
            return;
        }
        
        indicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Управление сайдбаром
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        console.log('toggleSidebar вызван:', { 
            windowWidth: window.innerWidth, 
            sidebarExists: !!sidebar, 
            overlayExists: !!overlay 
        });
        
        if (window.innerWidth <= 768) {
            // Мобильная версия
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
            console.log('Мобильная версия - переключаем классы:', {
                'mobile-open': sidebar.classList.contains('mobile-open'),
                'overlay-active': overlay.classList.contains('active')
            });
        } else {
            // Десктоп версия
            sidebar.classList.toggle('collapsed');
            console.log('Десктоп версия - переключаем collapsed:', sidebar.classList.contains('collapsed'));
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
    }

    initializeSidebar() {
        // Проверяем, нужно ли автоматически свернуть сайдбар на малых экранах
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('mobile-open');
        }
    }

    // Обработка изменения размера экрана
    setupMobileViewportFix() {
        // Фикс для мобильных браузеров с изменяющейся высотой viewport
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });
    }

    // Настройка жестов свайпа для мобильных устройств
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let isSwipingFromEdge = false;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;

        const mainContent = document.querySelector('.main-content');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        console.log('Настройка свайп-жестов...', { mainContent, sidebar, overlay });

        // Обработчик начала касания
        const handleTouchStart = (e) => {
            // Работаем только на мобильных устройствах
            if (window.innerWidth > 768) return;

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = startX;
            currentY = startY;

            // Всегда отслеживаем свайп (независимо от состояния сайдбара)
            isSwipingFromEdge = true;
            isDragging = false;
            
            console.log('TouchStart:', { startX, startY, isSwipingFromEdge, windowWidth: window.innerWidth });
        };

        // Обработчик движения пальца
        const handleTouchMove = (e) => {
            if (!isSwipingFromEdge || window.innerWidth > 768) return;

            const touch = e.touches[0];
            currentX = touch.clientX;
            currentY = touch.clientY;

            const deltaX = currentX - startX;
            const deltaY = Math.abs(currentY - startY);

            console.log('TouchMove:', { deltaX, deltaY, currentX, currentY });

            // Проверяем, что движение больше горизонтальное, чем вертикальное
            if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                isDragging = true;
                
                // Проверяем направление свайпа и состояние меню
                const isMenuOpen = sidebar.classList.contains('mobile-open');
                const isSwipeRight = deltaX > 0;
                const isSwipeLeft = deltaX < 0;
                
                // Предотвращаем стандартное поведение только для релевантных свайпов
                if ((isSwipeRight && !isMenuOpen) || (isSwipeLeft && isMenuOpen)) {
                    e.preventDefault();
                    
                    if (isSwipeRight && !isMenuOpen) {
                        // Открытие меню свайпом вправо
                        const progress = Math.min(deltaX / 150, 1);
                        
                        console.log('Показываем превью открытия:', { progress, deltaX });
                        
                        if (progress > 0.1) {
                            sidebar.style.transform = `translateX(${-240 + (240 * progress)}px)`;
                            sidebar.style.transition = 'none';
                            overlay.style.opacity = progress * 0.5;
                            overlay.style.display = 'block';
                            overlay.style.transition = 'none';
                        }
                    } else if (isSwipeLeft && isMenuOpen) {
                        // Закрытие меню свайпом влево
                        const progress = Math.min(Math.abs(deltaX) / 150, 1);
                        
                        console.log('Показываем превью закрытия:', { progress, deltaX });
                        
                        sidebar.style.transform = `translateX(${deltaX}px)`;
                        sidebar.style.transition = 'none';
                        overlay.style.opacity = (1 - progress) * 0.5;
                        overlay.style.transition = 'none';
                    }
                }
            }
        };

        // Обработчик окончания касания
        const handleTouchEnd = (e) => {
            if (!isSwipingFromEdge || window.innerWidth > 768) {
                // Всегда сбрасываем состояние, даже если условия не выполнены
                isSwipingFromEdge = false;
                isDragging = false;
                return;
            }

            const deltaX = currentX - startX;
            const deltaY = Math.abs(currentY - startY);

            console.log('TouchEnd:', { deltaX, deltaY, isDragging });

            // Сбрасываем стили
            sidebar.style.transform = '';
            sidebar.style.transition = '';
            overlay.style.transition = '';

            // Если был драг и движение достаточно большое
            if (isDragging && Math.abs(deltaX) > Math.abs(deltaY)) {
                const isMenuOpen = sidebar.classList.contains('mobile-open');
                
                // Открываем сайдбар если свайп вправо был достаточно длинным
                if (deltaX > 30 && !isMenuOpen) {
                    console.log('Открываем сайдбар!');
                    this.toggleSidebar();
                }
                // Закрываем сайдбар если свайп влево был достаточно длинным  
                else if (deltaX < -30 && isMenuOpen) {
                    console.log('Закрываем сайдбар!');
                    this.closeMobileSidebar();
                }
                // Иначе возвращаем в исходное состояние
                else {
                    overlay.style.opacity = '';
                    overlay.style.display = '';
                }
            } else {
                // Если не было драга, также сбрасываем overlay
                overlay.style.opacity = '';
                overlay.style.display = '';
            }

            // ВАЖНО: Всегда сбрасываем состояние в конце
            isSwipingFromEdge = false;
            isDragging = false;
            startX = 0;
            startY = 0;
            currentX = 0;
            currentY = 0;
        };

        // Добавляем обработчики событий для свайпов
        if (mainContent) {
            mainContent.addEventListener('touchstart', handleTouchStart, { passive: false });
            mainContent.addEventListener('touchmove', handleTouchMove, { passive: false });
            mainContent.addEventListener('touchend', handleTouchEnd, { passive: false });
        }

        // Также добавляем обработчики для body на случай, если касание началось вне main-content
        document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.body.addEventListener('touchend', handleTouchEnd, { passive: false });

        console.log('Свайп-жесты настроены!');
        
        // Для отладки - добавляем глобальную функцию для тестирования
        window.testSwipe = () => {
            console.log('Тестируем свайп...');
            this.toggleSidebar();
        };
    }

    // Автоматическое изменение высоты textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = newHeight + 'px';
    }

    resetTextareaHeight(textarea) {
        textarea.style.height = '24px';
    }

    // Обработка изменения ввода
    handleInputChange() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const charCount = document.getElementById('charCount');
        
        const message = messageInput.value.trim();
        
        // Обновляем состояние кнопки
        if (this.isTyping && !this.isPaused) {
            // Во время генерации - кнопка паузы (всегда активна)
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-pause"></i>';
            sendButton.className = 'send-btn pause-btn';
            sendButton.title = 'Приостановить генерацию';
        } else {
            // Обычное состояние - кнопка отправки
            sendButton.disabled = !message;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendButton.className = 'send-btn';
            sendButton.title = 'Отправить сообщение';
        }
        
        // Обновляем счетчик символов
        charCount.textContent = messageInput.value.length;
    }

    // Обработка изменения модели
    handleModelChange(value) {
        if (value === 'AUTO|auto') {
            // Режим авто - сбрасываем на циклический выбор
            this.currentProvider = null;
            this.currentModel = null;
            this.availableProviders = null;
            
            // Обновляем отображение
            const modelInfo = document.getElementById('modelInfo');
            if (modelInfo) {
                modelInfo.textContent = 'Авто';
            }
            
            const chatModel = document.querySelector('.chat-model');
            if (chatModel) {
                chatModel.textContent = 'Авто';
            }
        } else {
            // Конкретная модель с несколькими провайдерами
            const [model, providers] = value.split('|');
            this.currentModel = model;
            this.availableProviders = providers.split(',');
            this.currentProvider = this.availableProviders[0]; // Используем первого провайдера по умолчанию
            
            // Обновляем отображение модели (без провайдера)
            const modelInfo = document.getElementById('modelInfo');
            if (modelInfo) {
                modelInfo.textContent = model;
            }
            
            // Обновляем заголовок чата (если есть)
            const chatModel = document.querySelector('.chat-model');
            if (chatModel) {
                chatModel.textContent = model;
            }
        }
        
        // Сохраняем выбор в localStorage
        localStorage.setItem('selectedModelConfig', value);
        
        console.log(`Модель изменена: ${value === 'AUTO|auto' ? 'Авто режим' : this.currentModel + ' (провайдеры: ' + (this.availableProviders ? this.availableProviders.join(', ') : 'нет') + ')'}`);
    }

    // Загрузка сохраненной модели
    loadSavedModel() {
        // Пробуем загрузить новый формат
        const savedConfig = localStorage.getItem('selectedModelConfig');
        if (savedConfig) {
            const modelSelector = document.getElementById('modelSelector');
            if (modelSelector) {
                // Проверяем, есть ли такой вариант в селекторе
                const option = Array.from(modelSelector.options).find(opt => opt.value === savedConfig);
                if (option) {
                    modelSelector.value = savedConfig;
                    this.handleModelChange(savedConfig);
                    return;
                }
            }
        }
        
        // Поддержка старого формата для обратной совместимости
        const savedProvider = localStorage.getItem('selectedProvider');
        const savedModel = localStorage.getItem('selectedModel');
        
        if (savedProvider && savedModel && savedProvider !== 'AUTO') {
            const modelSelector = document.getElementById('modelSelector');
            if (modelSelector) {
                // Ищем модель в новом формате
                const modelName = savedModel;
                let matchingOption = null;
                
                for (const option of modelSelector.options) {
                    if (option.value !== 'AUTO|auto' && option.value.includes(modelName)) {
                        matchingOption = option;
                        break;
                    }
                }
                
                if (matchingOption) {
                    modelSelector.value = matchingOption.value;
                    this.handleModelChange(matchingOption.value);
                    
                    // Очищаем старые настройки
                    localStorage.removeItem('selectedProvider');
                    localStorage.removeItem('selectedModel');
                } else {
                    // Если не нашли, оставляем авто режим
                    this.handleModelChange('AUTO|auto');
                }
            }
        } else {
            // По умолчанию - авто режим
            this.handleModelChange('AUTO|auto');
        }
    }

    // Управление чатами
    selectChat(chatId) {
        this.currentChatId = chatId;
        this.renderCurrentChat();
        this.updateChatListSelection();
        this.closeMobileSidebar();
        
        // Скрываем кнопку "Продолжить генерацию" при переключении чата
        this.hideContinueSection();
    }

    getCurrentChat() {
        return this.chats.find(chat => chat.id === this.currentChatId);
    }

    renderCurrentChat() {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        // Очищаем контейнер сообщений, но сохраняем индикатор печати
        const messagesContainer = document.getElementById('messagesContainer');
        const typingIndicator = document.getElementById('typingIndicator');
        
        // Сначала убираем индикатор печати, если он отображается
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
        
        // Очищаем контейнер сообщений
        messagesContainer.innerHTML = '';
        
        // Восстанавливаем индикатор печати в контейнер
        if (typingIndicator) {
            messagesContainer.appendChild(typingIndicator);
        }

        // Обновляем заголовок
        this.updateChatTitle(currentChat.title);

        // Показываем/скрываем экран приветствия
        if (currentChat.messages.length === 0) {
            this.showWelcomeScreen();
        } else {
            this.hideWelcomeScreen();
            // Рендерим все сообщения
            currentChat.messages.forEach(message => {
                this.renderMessage(message);
            });
            
            // Обновляем кнопки Notion после рендеринга всех сообщений
            if (typeof updateNotionButtons === 'function') {
                updateNotionButtons();
            }
        }
    }

    updateChatTitle(title) {
        document.getElementById('currentChatTitle').textContent = title;
    }

    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'flex';
    }

    hideWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
    }

    updateChatList() {
        const chatList = document.getElementById('chatList');
        console.log('Обновляем список чатов, всего чатов:', this.chats.length);
        chatList.innerHTML = '';

        this.chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.dataset.chatId = chat.id;

            if (chat.id === this.currentChatId) {
                chatElement.classList.add('active');
            }

            chatElement.innerHTML = `
                <div class="chat-item-content">
                    <div class="chat-item-icon">
                        <i class="fas fa-comment-dots"></i>
                    </div>
                    <div class="chat-item-title">${chat.title}</div>
                    <div class="chat-item-actions">
                        <button class="chat-action-btn rename-btn" title="Переименовать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="chat-action-btn delete-btn" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            // Обработчики событий
            chatElement.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-action-btn')) {
                    this.selectChat(chat.id);
                }
            });

            // Десктоп действия
            const renameBtn = chatElement.querySelector('.rename-btn');
            const deleteBtn = chatElement.querySelector('.delete-btn');

            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.renameChatById(chat.id);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChatById(chat.id);
            });

            // Мобильные жесты (длительное нажатие)
            this.setupMobileGestures(chatElement, chat.id);

            chatList.appendChild(chatElement);
        });
    }

    updateChatListSelection() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-chat-id="${this.currentChatId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // Вспомогательные методы
    generateChatId() {
        return 'chat_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    generateMessageId() {
        return 'msg_' + Math.random().toString(36).substr(2, 9);
    }

    addMessageToChat(chatId, message) {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.messages.push(message);
            chat.updated_at = new Date().toISOString();
        }
    }

    scrollToBottom() {
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Сохранение и загрузка
    saveChatsToStorage() {
        try {
            localStorage.setItem('premium_chats', JSON.stringify(this.chats));
            localStorage.setItem('premium_current_chat', this.currentChatId);
        } catch (error) {
            console.error('Ошибка при сохранении чатов:', error);
        }
    }

    loadChatsFromStorage() {
        try {
            const chats = localStorage.getItem('premium_chats');
            const currentChatId = localStorage.getItem('premium_current_chat');
            
            console.log('Загружаем чаты из localStorage:', chats ? 'данные найдены' : 'данные отсутствуют');
            
            if (chats) {
                this.chats = JSON.parse(chats);
                console.log('Загружено чатов:', this.chats.length);
            } else {
                console.log('Данные чатов не найдены в localStorage, инициализируем пустой массив');
                this.chats = [];
            }
            
            if (currentChatId && this.chats.find(c => c.id === currentChatId)) {
                this.currentChatId = currentChatId;
                console.log('Восстановлен текущий чат:', currentChatId);
            }
        } catch (error) {
            console.error('Ошибка при загрузке чатов:', error);
            this.chats = [];
        }
    }

    // API методы
    async loadProviderInfo() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/providers/`);
            const data = await response.json();
            console.log('Provider info:', data);
        } catch (error) {
            console.error('Ошибка при загрузке информации о провайдерах:', error);
        }
    }

    async clearCurrentChat() {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        if (confirm('Очистить текущий чат?')) {
            currentChat.messages = [];
            this.renderCurrentChat();
            this.saveChatsToStorage();

            // Очищаем на сервере
            try {
                await fetch(`${this.apiBaseUrl}/sessions/${currentChat.session_id}/clear/`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.warn('Ошибка при очистке чата на сервере:', error);
            }
        }
    }

    async exportCurrentChat() {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: currentChat.session_id,
                    format: 'json'
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat_${currentChat.session_id.slice(0, 8)}.json`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Ошибка при экспорте чата:', error);
        }
    }

    async clearAllChats() {
        if (confirm('Удалить все чаты? Это действие нельзя отменить.')) {
            // Сохраняем sessionIds перед очисткой массива
            const sessionIds = this.chats.map(chat => chat.session_id);
            
            this.chats = [];
            this.currentChatId = null;
            this.saveChatsToStorage();
            this.updateChatList();
            this.createNewChat();

            // Очищаем на сервере
            try {
                await fetch(`${this.apiBaseUrl}/clear-all/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_ids: sessionIds
                    })
                });
            } catch (error) {
                console.warn('Ошибка при очистке всех чатов на сервере:', error);
            }
        }
    }

    // Модальные окна
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        // Небольшая задержка для плавного появления
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        // Ждем завершения анимации перед скрытием
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    // Копирование контента
    copyMessageContent(content) {
        navigator.clipboard.writeText(content).then(() => {
            // Показать уведомление о копировании
            console.log('Скопировано в буфер обмена');
        }).catch(err => {
            console.error('Ошибка при копировании:', err);
        });
    }

    // Методы для мобильных жестов и контекстного меню
    setupMobileGestures(element, chatId) {
        let startTime;
        let startY;
        let moved = false;

        const startLongPress = (e) => {
            startTime = Date.now();
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            moved = false;
            
            this.longPressTimer = setTimeout(() => {
                if (!moved) {
                    this.showMobileContextMenu(e, chatId);
                    element.classList.add('long-pressing');
                }
            }, 500);
        };

        const cancelLongPress = () => {
            clearTimeout(this.longPressTimer);
            element.classList.remove('long-pressing');
            
            if (!moved && Date.now() - startTime < 500) {
                // Короткий тап - выбрать чат
                this.selectChat(chatId);
            }
        };

        const handleMove = (e) => {
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;
            if (Math.abs(currentY - startY) > 10) {
                moved = true;
                cancelLongPress();
            }
        };

        // Touch события для мобильных устройств
        element.addEventListener('touchstart', startLongPress, { passive: true });
        element.addEventListener('touchmove', handleMove, { passive: true });
        element.addEventListener('touchend', cancelLongPress);

        // Mouse события для десктопа (правой кнопкой)
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showMobileContextMenu(e, chatId);
        });
    }

    showMobileContextMenu(e, chatId) {
        const contextMenu = document.getElementById('mobileContextMenu');
        this.contextMenuTarget = chatId;
        
        contextMenu.classList.add('active');
        
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        
        // Проверяем границы экрана
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
        }
    }

    hideMobileContextMenu() {
        document.getElementById('mobileContextMenu').classList.remove('active');
        this.contextMenuTarget = null;
        
        // Убираем эффект длительного нажатия со всех элементов
        document.querySelectorAll('.chat-item.long-pressing').forEach(item => {
            item.classList.remove('long-pressing');
        });
    }

    // Переименование и удаление чатов
    renameChatById(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        const input = document.getElementById('chatRenameInput');
        input.value = chat.title;
        
        this.showModal('renameModal');
        this.contextMenuTarget = chatId;
        
        setTimeout(() => input.focus(), 100);
    }

    async confirmChatRename() {
        const chatId = this.contextMenuTarget;
        const newTitle = document.getElementById('chatRenameInput').value.trim();
        
        if (!newTitle || !chatId) return;

        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.title = newTitle;
            
            if (chat.id === this.currentChatId) {
                this.updateChatTitle(newTitle);
            }
            
            this.updateChatList();
            this.saveChatsToStorage();

            // Обновляем на сервере
            try {
                await fetch(`${this.apiBaseUrl}/sessions/${chat.session_id}/rename/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: newTitle
                    })
                });
            } catch (error) {
                console.warn('Ошибка при переименовании чата на сервере:', error);
            }
        }

        this.closeModal('renameModal');
        this.contextMenuTarget = null;
    }

    async deleteChatById(chatId) {
        if (!confirm('Удалить этот чат?')) return;

        const chatIndex = this.chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) return;

        const chat = this.chats[chatIndex];

        // Удаляем чат
        this.chats.splice(chatIndex, 1);

        // Если удаляем текущий чат, переключаемся на другой
        if (chatId === this.currentChatId) {
            if (this.chats.length > 0) {
                this.selectChat(this.chats[0].id);
            } else {
                this.createNewChat();
                return;
            }
        }

        this.updateChatList();
        this.saveChatsToStorage();

        // Удаляем на сервере
        try {
            await fetch(`${this.apiBaseUrl}/sessions/${chat.session_id}/`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.warn('Ошибка при удалении чата на сервере:', error);
        }
    }

    // Заглушки для будущих функций
    showSettings() {
        alert('Настройки будут доступны в следующих версиях');
    }

    showUserProfile() {
        // Обновляем данные статистики
        this.updateStatsModal();
        // Показываем модальное окно статистики
        this.showModal('statsModal');
    }

    updateStatsModal() {
        // Подсчитываем статистику
        const totalChats = this.chats.length;
        const totalMessages = this.chats.reduce((total, chat) => total + chat.messages.length, 0);
        const totalCharacters = this.chats.reduce((total, chat) => {
            return total + chat.messages.reduce((msgTotal, msg) => msgTotal + msg.content.length, 0);
        }, 0);

        // Обновляем элементы интерфейса
        const totalChatsElement = document.getElementById('totalChats');
        const totalMessagesElement = document.getElementById('totalMessages');
        const totalCharactersElement = document.getElementById('totalCharacters');
        
        if (totalChatsElement) totalChatsElement.textContent = totalChats;
        if (totalMessagesElement) totalMessagesElement.textContent = totalMessages;
        if (totalCharactersElement) totalCharactersElement.textContent = totalCharacters;

        // Рассчитываем уровень активности (0-100%)
        const activityScore = Math.min(100, Math.floor((totalMessages * 2 + totalChats * 5) / 2));
        const activityPercentageElement = document.getElementById('activityPercentage');
        const activityProgressElement = document.getElementById('activityProgress');
        
        if (activityPercentageElement) activityPercentageElement.textContent = activityScore + '%';
        if (activityProgressElement) activityProgressElement.style.width = activityScore + '%';

        // Обновляем достижения
        this.updateAchievements(totalChats, totalMessages, totalCharacters);
    }

    updateAchievements(totalChats, totalMessages, totalCharacters) {
        const achievementsGrid = document.getElementById('achievementsGrid');
        if (!achievementsGrid) return;

        const achievements = [
            {
                id: 'first_chat',
                name: window.localizationManager ? window.localizationManager.translate('achievements.first_chat') : 'Первый шаг',
                description: window.localizationManager ? window.localizationManager.translate('achievements.descriptions.first_chat') : 'Создать первый чат',
                icon: 'fas fa-baby',
                unlocked: totalChats >= 1,
                progress: Math.min(100, (totalChats / 1) * 100)
            },
            {
                id: 'chat_master',
                name: window.localizationManager ? window.localizationManager.translate('achievements.chat_master') : 'Мастер чатов',
                description: window.localizationManager ? window.localizationManager.translate('achievements.descriptions.chat_master') : 'Создать 10 чатов',
                icon: 'fas fa-comments',
                unlocked: totalChats >= 10,
                progress: Math.min(100, (totalChats / 10) * 100)
            },
            {
                id: 'message_warrior',
                name: window.localizationManager ? window.localizationManager.translate('achievements.message_warrior') : 'Воин сообщений',
                description: window.localizationManager ? window.localizationManager.translate('achievements.descriptions.message_warrior') : 'Отправить 100 сообщений',
                icon: 'fas fa-paper-plane',
                unlocked: totalMessages >= 100,
                progress: Math.min(100, (totalMessages / 100) * 100)
            },
            {
                id: 'word_master',
                name: window.localizationManager ? window.localizationManager.translate('achievements.word_master') : 'Мастер слов',
                description: window.localizationManager ? window.localizationManager.translate('achievements.descriptions.word_master') : 'Написать 10000 символов',
                icon: 'fas fa-keyboard',
                unlocked: totalCharacters >= 10000,
                progress: Math.min(100, (totalCharacters / 10000) * 100)
            }
        ];

        achievementsGrid.innerHTML = achievements.map(achievement => `
            <div class="achievement ${achievement.unlocked ? 'unlocked' : 'locked'}" 
                 title="${achievement.description}"
                 data-achievement-id="${achievement.id}"
                 data-achievement-name="${achievement.name}"
                 data-achievement-desc="${achievement.description}"
                 data-achievement-icon="${achievement.icon}"
                 data-achievement-progress="${achievement.progress}"
                 data-achievement-unlocked="${achievement.unlocked}">
                <div class="achievement-icon">
                    <i class="${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-progress-text">${Math.floor(achievement.progress)}%</div>
                </div>
                <div class="achievement-progress-bar">
                    <div class="achievement-progress-fill" style="width: ${achievement.progress}%"></div>
                </div>
            </div>
        `).join('');
        
        // Добавляем обработчики кликов для достижений
        const achievementElements = achievementsGrid.querySelectorAll('.achievement');
        achievementElements.forEach(element => {
            element.addEventListener('click', () => {
                this.showAchievementDetail(element);
            });
        });
    }

    showAchievementDetail(achievementElement) {
        // Получаем данные достижения из data-атрибутов
        const achievementId = achievementElement.dataset.achievementId;
        const achievementName = achievementElement.dataset.achievementName;
        const achievementDesc = achievementElement.dataset.achievementDesc;
        const achievementIcon = achievementElement.dataset.achievementIcon;
        const achievementProgress = parseFloat(achievementElement.dataset.achievementProgress);
        const achievementUnlocked = achievementElement.dataset.achievementUnlocked === 'true';

        // Заполняем модальное окно данными
        const modalTitle = document.getElementById('achievementModalTitle');
        const modalIcon = document.getElementById('achievementModalIcon');
        const modalName = document.getElementById('achievementModalName');
        const modalDesc = document.getElementById('achievementModalDesc');
        const modalStatus = document.getElementById('achievementStatus');
        const modalProgress = document.getElementById('achievementProgress');
        const modalProgressFill = document.getElementById('achievementProgressFill');
        const modalProgressText = document.getElementById('achievementProgressText');

        if (modalIcon) modalIcon.className = achievementIcon;
        if (modalName) modalName.textContent = achievementName;
        if (modalDesc) modalDesc.textContent = achievementDesc;
        
        // Обновляем статус
        if (modalStatus) {
            if (achievementUnlocked) {
                const unlockedText = window.localizationManager ? window.localizationManager.translate('achievements.modal.unlocked') : 'Achievement unlocked!';
                modalStatus.innerHTML = `<i class="fas fa-check-circle"></i><span>${unlockedText}</span>`;
                modalStatus.className = 'achievement-status unlocked';
            } else {
                const lockedText = window.localizationManager ? window.localizationManager.translate('achievements.modal.locked') : 'Achievement locked';
                modalStatus.innerHTML = `<i class="fas fa-lock"></i><span>${lockedText}</span>`;
                modalStatus.className = 'achievement-status locked';
            }
        }

        // Обновляем прогресс
        if (modalProgressFill) modalProgressFill.style.width = achievementProgress + '%';
        if (modalProgressText) {
            const completedText = window.localizationManager ? window.localizationManager.translate('achievements.modal.progress_completed') : 'выполнено';
            modalProgressText.textContent = `${Math.floor(achievementProgress)}% ${completedText}`;
        }

        // Показываем модальное окно
        this.showModal('achievementModal');
    }

    formatSessionTime() {
        const now = Date.now();
        const sessionDuration = now - this.sessionStartTime;
        const minutes = Math.floor(sessionDuration / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}ч ${minutes % 60}м`;
        } else {
            return `${minutes}м`;
        }
    }

    exportAllChats() {
        // Экспорт всех чатов
        const data = {
            chats: this.chats,
            exported_at: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `premium_chats_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    toggleMessageFavorite(messageId) {
        // Переключение избранного для сообщения
        console.log('Переключение избранного для сообщения:', messageId);
    }

    // Методы для управления кнопкой отправки/паузы
    setSendButtonToPauseMode() {
        const sendButton = document.getElementById('sendButton');
        const icon = sendButton.querySelector('i');
        
        sendButton.classList.add('pause-mode');
        sendButton.title = 'Приостановить генерацию';
        icon.className = 'fas fa-pause';
    }

    setSendButtonToNormalMode() {
        const sendButton = document.getElementById('sendButton');
        const icon = sendButton.querySelector('i');
        
        sendButton.classList.remove('pause-mode');
        sendButton.title = 'Отправить сообщение';
        icon.className = 'fas fa-paper-plane';
    }

    // Методы для паузы и продолжения генерации
    pauseGeneration() {
        if (this.currentRequest) {
            this.currentRequest.abort();
        }
        
        this.isPaused = true;
        this.hideTypingIndicator();
        this.isTyping = false;
        this.handleInputChange(); // Переключаем кнопку обратно в режим отправки
        
        // Создаем пустое сообщение ассистента
        const currentChat = this.getCurrentChat();
        if (currentChat) {
            const pausedMessage = {
                id: this.generateMessageId(),
                type: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                isPaused: true
            };

            this.pendingMessage = pausedMessage;
            this.addMessageToChat(currentChat.id, pausedMessage);
            this.renderPausedMessage(pausedMessage);
            this.showContinueSection();
        }
        
        this.currentRequest = null;
    }

    continueGeneration() {
        if (this.pendingMessage) {
            // Удаляем приостановленное сообщение из отображения, но не из чата
            const pausedElement = document.querySelector(`[data-message-id="${this.pendingMessage.id}"]`);
            if (pausedElement) {
                pausedElement.remove();
            }
            
            // Удаляем из массива сообщений
            const currentChat = this.getCurrentChat();
            if (currentChat) {
                const index = currentChat.messages.findIndex(msg => msg.id === this.pendingMessage.id);
                if (index !== -1) {
                    currentChat.messages.splice(index, 1);
                }
            }

            this.pendingMessage = null;
        }

        this.hideContinueSection();
        
        // Получаем последнее сообщение пользователя для повторной отправки
        const currentChat = this.getCurrentChat();
        if (currentChat && currentChat.messages.length > 0) {
            const lastUserMessage = [...currentChat.messages]
                .reverse()
                .find(msg => msg.type === 'user');
            
            if (lastUserMessage) {
                console.log('Продолжаем генерацию для сообщения:', lastUserMessage.content);
                // Отправляем сообщение заново для продолжения генерации
                this.sendContinueMessage(lastUserMessage.content);
            }
        }
    }

    async sendContinueMessage(messageContent) {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        console.log('Отправляем сообщение для продолжения генерации:', messageContent);

        this.showTypingIndicator();
        this.isTyping = true;
        this.isPaused = false;
        this.handleInputChange(); // Переключаем кнопку в режим паузы

        try {
            // Определяем параметры для отправки
            let requestParams = {
                message: messageContent,
                session_id: currentChat.session_id,
                include_history: true,
                max_history: 50,
                continue_generation: true // Флаг для продолжения генерации
            };

            // Если выбрана конкретная модель, передаем её и список провайдеров
            if (this.currentModel && this.availableProviders) {
                requestParams.model = this.currentModel;
                requestParams.providers = this.availableProviders;
                requestParams.provider = this.currentProvider;
            }

            // Создаем контроллер для возможности отмены запроса
            const controller = new AbortController();
            this.currentRequest = controller;

            // Отправляем сообщение на сервер
            const response = await fetch(`${this.apiBaseUrl}/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestParams),
                signal: controller.signal
            });

            // Проверяем, не была ли генерация приостановлена
            if (this.isPaused) {
                // Создаем пустое сообщение ассистента и показываем кнопку продолжения
                const pausedMessage = {
                    id: this.generateMessageId(),
                    type: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isPaused: true
                };

                this.pendingMessage = pausedMessage;
                this.addMessageToChat(currentChat.id, pausedMessage);
                this.renderPausedMessage(pausedMessage);
                this.showContinueSection();
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Добавляем ответ ассистента
                const assistantMessage = {
                    id: data.message_id || this.generateMessageId(),
                    type: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString(),
                    provider: data.provider_used,
                    response_time: data.response_time
                };

                this.addMessageToChat(currentChat.id, assistantMessage);
                this.renderMessage(assistantMessage);
                
                // Обновляем текущий провайдер если он был изменен на бэкенде
                if (data.provider_used && this.availableProviders && this.availableProviders.includes(data.provider_used)) {
                    this.currentProvider = data.provider_used;
                }
            } else {
                // Показываем ошибку
                const errorMessage = {
                    id: this.generateMessageId(),
                    type: 'system',
                    content: data.response || 'Произошла ошибка при получении ответа',
                    timestamp: new Date().toISOString()
                };

                this.addMessageToChat(currentChat.id, errorMessage);
                this.renderMessage(errorMessage);
            }
        } catch (error) {
            // Проверяем, была ли отмена запроса (пауза)
            if (error.name === 'AbortError') {
                console.log('Запрос был отменен (пауза)');
                return;
            }

            console.error('Ошибка при продолжении генерации:', error);
            
            const errorMessage = {
                id: this.generateMessageId(),
                type: 'system',
                content: 'Ошибка подключения к серверу. Проверьте подключение к интернету.',
                timestamp: new Date().toISOString()
            };

            this.addMessageToChat(currentChat.id, errorMessage);
            this.renderMessage(errorMessage);
        } finally {
            if (!this.isPaused) {
                this.hideTypingIndicator();
                this.isTyping = false;
                this.handleInputChange(); // Переключаем кнопку обратно в режим отправки
                this.currentRequest = null;
                this.saveChatsToStorage();
            }
        }
    }

    renderPausedMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message assistant message-appear paused`;
        messageElement.setAttribute('data-message-id', message.id);

        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-status paused">
                    <i class="fas fa-pause-circle"></i>
                    Генерация приостановлена
                </div>
            </div>
        `;

        // Добавляем сообщение перед индикатором печати
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && messagesContainer.contains(typingIndicator)) {
            messagesContainer.insertBefore(messageElement, typingIndicator);
        } else {
            messagesContainer.appendChild(messageElement);
        }
        
        this.scrollToBottom();
    }

    showContinueSection() {
        const section = document.getElementById('pauseContinueSection');
        if (section) {
            section.style.display = 'flex';
        }
    }

    hideContinueSection() {
        const section = document.getElementById('pauseContinueSection');
        if (section) {
            section.style.display = 'none';
        }
    }

    // Методы для inline редактирования сообщений
    startEditMessage(messageElement, messageId) {
        messageElement.classList.add('editing');
        const textarea = messageElement.querySelector('.message-edit-textarea');
        if (textarea) {
            textarea.focus();
            // Устанавливаем курсор в конец текста
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }

    cancelEditMessage(messageElement) {
        messageElement.classList.remove('editing');
    }

    saveEditMessage(messageElement, messageId) {
        const textarea = messageElement.querySelector('.message-edit-textarea');
        const newContent = textarea.value.trim();
        
        if (!newContent) {
            alert('Сообщение не может быть пустым');
            return;
        }

        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        // Находим сообщение и его индекс
        const messageIndex = currentChat.messages.findIndex(msg => msg.id === messageId);
        if (messageIndex === -1) return;

        // Подтверждение удаления последующих сообщений
        const subsequentMessages = currentChat.messages.slice(messageIndex + 1);
        if (subsequentMessages.length > 0) {
            const confirmDelete = confirm(
                `При редактировании этого сообщения будет удалено ${subsequentMessages.length} последующих сообщений. Продолжить?`
            );
            if (!confirmDelete) return;
        }

        // Удаляем текущее сообщение и все последующие сообщения
        currentChat.messages = currentChat.messages.slice(0, messageIndex);

        // Перерендериваем чат
        this.renderCurrentChat();
        
        // Сохраняем изменения
        this.saveChatsToStorage();
        
        // Автоматически отправляем новое сообщение и запускаем генерацию
        console.log('Вызываем sendMessageContent с содержимым:', newContent);
        this.sendMessageContent(newContent);
    }

    // Методы для паузы и продолжения генерации
    pauseGeneration() {
        if (this.isTyping && this.currentRequest) {
            this.isPaused = true;
            this.currentRequest.abort();
            this.hideTypingIndicator();
            this.isTyping = false;
            this.handleInputChange(); // Обновляем состояние кнопки
            
            // Создаем пустое сообщение ассистента и показываем кнопку продолжения
            const currentChat = this.getCurrentChat();
            if (currentChat) {
                const pausedMessage = {
                    id: this.generateMessageId(),
                    type: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isPaused: true
                };

                this.pendingMessage = pausedMessage;
                this.addMessageToChat(currentChat.id, pausedMessage);
                this.renderPausedMessage(pausedMessage);
                this.showContinueSection();
            }
            
            console.log('Генерация приостановлена');
        }
    }

    // Этот метод был дублирован и удален, используется основной continueGeneration выше

    showPauseButton() {
        // Обновляем кнопку отправки через handleInputChange
        this.handleInputChange();
    }

    hidePauseButton() {
        // Обновляем кнопку отправки через handleInputChange
        this.handleInputChange();
    }

    // Дублированные методы удалены, используем методы выше

    // Отправка сообщения с конкретным содержимым (для редактирования)
    async sendMessageContent(messageContent) {
        console.log('sendMessageContent вызван с содержимым:', messageContent);
        
        if (!messageContent.trim()) {
            console.log('Содержимое пустое, прерываем выполнение');
            return;
        }

        const currentChat = this.getCurrentChat();
        if (!currentChat) {
            console.error('Нет активного чата');
            return;
        }

        // Добавляем сообщение пользователя
        const userMessage = {
            id: this.generateMessageId(),
            type: 'user',
            content: messageContent,
            timestamp: new Date().toISOString()
        };

        this.addMessageToChat(currentChat.id, userMessage);
        this.renderMessage(userMessage);
        this.hideWelcomeScreen();

        // Обновляем название чата если это первое сообщение
        if (currentChat.messages.length === 1) {
            currentChat.title = messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent;
            this.updateChatList();
            this.updateChatTitle(currentChat.title);
        }

        // Показываем индикатор печати и переключаем кнопку в режим паузы
        console.log('Показываем индикатор печати и переключаем в режим паузы');
        this.showTypingIndicator();
        this.isTyping = true;
        this.isPaused = false;
        this.handleInputChange(); // Это переключит кнопку в режим паузы

        try {
            // Определяем параметры для отправки
            let requestParams = {
                message: messageContent,
                session_id: currentChat.session_id,
                include_history: true,
                max_history: 50
            };

            // Если выбрана конкретная модель, передаем её и список провайдеров
            if (this.currentModel && this.availableProviders) {
                requestParams.model = this.currentModel;
                requestParams.providers = this.availableProviders;
                requestParams.provider = this.currentProvider;
            }

            // Создаем контроллер для возможности отмены запроса
            const controller = new AbortController();
            this.currentRequest = controller;

            // Отправляем сообщение на сервер
            const response = await fetch(`${this.apiBaseUrl}/chat/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestParams),
                signal: controller.signal
            });

            // Проверяем, не была ли генерация приостановлена
            if (this.isPaused) {
                // Создаем пустое сообщение ассистента и показываем кнопку продолжения
                const pausedMessage = {
                    id: this.generateMessageId(),
                    type: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString(),
                    isPaused: true
                };

                this.pendingMessage = pausedMessage;
                this.addMessageToChat(currentChat.id, pausedMessage);
                this.renderPausedMessage(pausedMessage);
                this.showContinueSection();
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Добавляем ответ ассистента
                const assistantMessage = {
                    id: data.message_id || this.generateMessageId(),
                    type: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString(),
                    provider: data.provider_used,
                    response_time: data.response_time
                };

                this.addMessageToChat(currentChat.id, assistantMessage);
                this.renderMessage(assistantMessage);
                
                // Обновляем текущий провайдер если он был изменен на бэкенде
                if (data.provider_used && this.availableProviders && this.availableProviders.includes(data.provider_used)) {
                    this.currentProvider = data.provider_used;
                }
            } else {
                // Показываем ошибку
                const errorMessage = {
                    id: this.generateMessageId(),
                    type: 'system',
                    content: data.response || 'Произошла ошибка при получении ответа',
                    timestamp: new Date().toISOString()
                };

                this.addMessageToChat(currentChat.id, errorMessage);
                this.renderMessage(errorMessage);
            }
        } catch (error) {
            // Проверяем, была ли отмена запроса (пауза)
            if (error.name === 'AbortError') {
                console.log('Запрос был отменен (пауза)');
                return;
            }

            console.error('Ошибка при отправке сообщения:', error);
            
            const errorMessage = {
                id: this.generateMessageId(),
                type: 'system',
                content: 'Ошибка подключения к серверу. Проверьте подключение к интернету.',
                timestamp: new Date().toISOString()
            };

            this.addMessageToChat(currentChat.id, errorMessage);
            this.renderMessage(errorMessage);
        } finally {
            if (!this.isPaused) {
                this.hideTypingIndicator();
                this.isTyping = false;
                this.handleInputChange(); // Переключаем кнопку обратно в режим отправки
                this.currentRequest = null;
                this.saveChatsToStorage();
            }
        }
    }

    // Дублированные методы удалены, используем методы выше

    renderPausedMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message assistant message-appear`;
        messageElement.dataset.messageId = message.id;

        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-status paused">
                    <i class="fas fa-pause-circle"></i>
                    Генерация приостановлена
                </div>
            </div>
        `;

        // Добавляем сообщение перед индикатором печати
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && messagesContainer.contains(typingIndicator)) {
            messagesContainer.insertBefore(messageElement, typingIndicator);
        } else {
            messagesContainer.appendChild(messageElement);
        }
        
        this.scrollToBottom();
    }

    // Методы для редактирования сообщений
    editMessage(messageId) {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        const message = currentChat.messages.find(msg => msg.id === messageId);
        if (!message || message.type !== 'user') return;

        // Заполняем модальное окно
        const editInput = document.getElementById('editMessageInput');
        if (editInput) {
            editInput.value = message.content;
            this.editingMessageId = messageId;
            this.showModal('editMessageModal');
            
            // Фокус на поле ввода с небольшой задержкой
            setTimeout(() => {
                editInput.focus();
                editInput.select();
            }, 100);
        }
    }

    confirmEditMessage() {
        const editInput = document.getElementById('editMessageInput');
        const newContent = editInput.value.trim();
        
        if (!newContent || !this.editingMessageId) {
            return;
        }

        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        // Находим индекс редактируемого сообщения
        const messageIndex = currentChat.messages.findIndex(msg => msg.id === this.editingMessageId);
        if (messageIndex === -1) return;

        // Удаляем все сообщения после редактируемого
        const messagesToRemove = currentChat.messages.slice(messageIndex + 1);
        currentChat.messages = currentChat.messages.slice(0, messageIndex + 1);

        // Обновляем содержимое сообщения
        currentChat.messages[messageIndex].content = newContent;
        currentChat.messages[messageIndex].edited = true;
        currentChat.messages[messageIndex].editedAt = new Date().toISOString();

        // Закрываем модальное окно
        this.closeModal('editMessageModal');
        this.editingMessageId = null;

        // Перерендериваем чат
        this.renderCurrentChat();

        // Автоматически отправляем отредактированное сообщение
        const messageInput = document.getElementById('messageInput');
        messageInput.value = newContent;
        this.handleInputChange();
        
        // Небольшая задержка перед отправкой
        setTimeout(() => {
            this.sendMessage();
        }, 100);

        this.saveChatsToStorage();
    }

    removeMessage(messageId) {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;

        currentChat.messages = currentChat.messages.filter(msg => msg.id !== messageId);
        this.renderCurrentChat();
        this.saveChatsToStorage();
    }

    // Методы для работы с файлами
    handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            alert('Поддерживаются только изображения');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            alert('Размер файла не должен превышать 10MB');
            return;
        }

        this.selectedFile = file;
        this.showFilePreview(file);
    }

    showFilePreview(file) {
        const filePreview = document.getElementById('filePreview');
        const previewImage = document.getElementById('previewImage');
        const fileName = document.getElementById('fileName');

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            fileName.textContent = file.name;
            filePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    removeSelectedFile() {
        this.selectedFile = null;
        const filePreview = document.getElementById('filePreview');
        const fileInput = document.getElementById('fileInput');
        
        filePreview.style.display = 'none';
        fileInput.value = '';
    }

    async uploadFileToBase64() {
        if (!this.selectedFile) return null;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.selectedFile);
        });
    }

    // Методы для генерации изображений
    showImageGenerationPrompt() {
        const messageInput = document.getElementById('messageInput');
        const prompt = messageInput.value.trim();
        
        if (!prompt) {
            alert('Введите описание изображения для генерации');
            return;
        }
        
        if (prompt.length > 500) {
            alert('Описание изображения слишком длинное (максимум 500 символов)');
            return;
        }
        
        // Очищаем поле ввода
        messageInput.value = '';
        this.handleInputChange();
        this.resetTextareaHeight(messageInput);
        
        // Запускаем генерацию
        this.generateImage(prompt);
    }

    async generateImage(prompt) {
        const currentChat = this.getCurrentChat();
        if (!currentChat) {
            console.error('Нет активного чата');
            return;
        }

        // Добавляем сообщение пользователя с запросом
        const userMessage = {
            id: this.generateMessageId(),
            type: 'user',
            content: `Сгенерируй изображение: ${prompt}`,
            timestamp: new Date().toISOString()
        };

        this.addMessageToChat(currentChat.id, userMessage);
        this.renderMessage(userMessage);
        this.hideWelcomeScreen();

        // Показываем индикатор генерации
        this.showImageGenerationIndicator();
        this.setGenerateButtonState(true);

        try {
            // Отправляем запрос на генерацию
            const response = await this.safeFetch(`${this.apiBaseUrl}/generate-image/`, {
                method: 'POST',
                body: JSON.stringify({
                    prompt: prompt
                })
            });

            const data = await response.json();

            if (data.success) {
                // Генерация успешна - используем URL изображения
                const imageUrl = data.image_url || data.image_data;
                
                const imageMessage = {
                    id: this.generateMessageId(),
                    type: 'assistant',
                    content: `Изображение сгенерировано: "${prompt}"`,
                    timestamp: new Date().toISOString(),
                    image: imageUrl,
                    provider: data.provider_used,
                    response_time: data.response_time,
                    isGenerated: true
                };

                this.addMessageToChat(currentChat.id, imageMessage);
                this.renderMessage(imageMessage);
                
                console.log(`SUCCESS! Изображение сгенерировано провайдером ${data.provider_used} за ${data.response_time}с`);
                console.log('URL изображения:', imageUrl);
            } else {
                // Ошибка генерации
                const errorMessage = {
                    id: this.generateMessageId(),
                    type: 'system',
                    content: data.message || 'Не удалось сгенерировать изображение. Попробуйте другое описание.',
                    timestamp: new Date().toISOString()
                };

                this.addMessageToChat(currentChat.id, errorMessage);
                this.renderMessage(errorMessage);
                
                console.error('❌ Ошибка генерации изображения:', data.error);
            }
        } catch (error) {
            console.error('Ошибка при запросе генерации изображения:', error);
            
            const errorMessage = {
                id: this.generateMessageId(),
                type: 'system',
                content: 'Ошибка подключения к серверу генерации изображений.',
                timestamp: new Date().toISOString()
            };

            this.addMessageToChat(currentChat.id, errorMessage);
            this.renderMessage(errorMessage);
        } finally {
            this.hideImageGenerationIndicator();
            this.setGenerateButtonState(false);
            this.saveChatsToStorage();
        }
    }

    showImageGenerationIndicator() {
        // Показываем специальный индикатор для генерации изображений
        const messagesContainer = document.getElementById('messagesContainer');
        
        // Удаляем старый индикатор если есть
        const existingIndicator = document.getElementById('imageGenerationIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'imageGenerationIndicator';
        indicator.className = 'message assistant message-appear';
        indicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-cog fa-spin"></i>
            </div>
            <div class="message-content">
                <div class="message-content-text">
                    <div class="image-generation-progress">
                        <i class="fas fa-cog fa-spin"></i>
                        Генерирую изображение...
                    </div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideImageGenerationIndicator() {
        const indicator = document.getElementById('imageGenerationIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    setGenerateButtonState(isGenerating) {
        const generateOption = document.querySelector('[data-action="generate"]');
        if (generateOption) {
            if (isGenerating) {
                generateOption.classList.add('generating');
                generateOption.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерирую...';
                generateOption.style.pointerEvents = 'none';
            } else {
                generateOption.classList.remove('generating');
                generateOption.innerHTML = '<i class="fas fa-magic"></i> Генерировать изображение';
                generateOption.style.pointerEvents = '';
            }
        }
    }

    // Методы для модального окна изображений
    openImageModal(imageSrc) {
        console.log('Opening image modal with src:', imageSrc);
        
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        
        if (!modal || !modalImage) {
            console.error('Image modal elements not found');
            return;
        }
        
        modalImage.src = imageSrc;
        
        // Используем тот же подход, что и для других модальных окон
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        
        // Принудительный reflow для применения стилей
        modal.offsetHeight;
        
        setTimeout(() => {
            modal.classList.add('active');
            modal.style.opacity = '1';
        }, 10);
        
        // Предотвращаем прокрутку страницы при открытом модальном окне
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // Блокируем touch события на body для предотвращения прокрутки
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${scrollY}px`;
        
        console.log('Image modal opened successfully');
    }

    closeImageModal() {
        console.log('Closing image modal');
        
        const modal = document.getElementById('imageModal');
        if (!modal) {
            console.error('Image modal not found');
            return;
        }
        
        modal.classList.remove('active');
        modal.style.opacity = '0';
        
        // Ждем завершения анимации перед скрытием
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
        
        // Восстанавливаем прокрутку страницы
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        // Восстанавливаем позицию прокрутки
        if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        
        console.log('Image modal closed successfully');
    }

    initializeImageModalEvents() {
        const modal = document.getElementById('imageModal');
        const closeBtn = document.getElementById('closeImageModal');
        const modalBody = modal.querySelector('.image-modal-body');
        const modalImage = document.getElementById('modalImage');
        
        // Переменные для зума и панорамирования
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let initialDistance = 0;
        let initialScale = 1;
        let initialX = 0;
        let initialY = 0;
        let isPinching = false;
        let isDragging = false;
        let lastTouchTime = 0;
        
        // Функция применения трансформации с ограничениями
        const applyTransform = () => {
            if (scale > 1) {
                // Получаем размеры изображения
                const rect = modalImage.getBoundingClientRect();
                const containerRect = modalBody.getBoundingClientRect();
                
                // Вычисляем максимальные смещения для увеличенного изображения
                const scaledWidth = rect.width * scale;
                const scaledHeight = rect.height * scale;
                
                const maxTranslateX = Math.max(0, (scaledWidth - rect.width) / 2);
                const maxTranslateY = Math.max(0, (scaledHeight - rect.height) / 2);
                
                // Ограничиваем перемещение
                translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
                translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
            } else {
                translateX = 0;
                translateY = 0;
            }
            
            modalImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };
        
        // Функция сброса зума
        const resetZoom = () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            modalImage.classList.remove('zoomed');
            applyTransform();
        };
        
        // Закрытие по кнопке X
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeImageModal();
        });
        
        // Закрытие по клику на фон модального окна (только если не увеличено)
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target === modalBody) {
                if (scale === 1) {
                    this.closeImageModal();
                } else {
                    resetZoom();
                }
            }
        });
        
        // Предотвращаем закрытие при клике на изображение
        if (modalImage) {
            modalImage.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Закрытие по клавише Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                if (scale === 1) {
                    this.closeImageModal();
                } else {
                    resetZoom();
                }
            }
        });
        
        // === TOUCH EVENTS для мобильных устройств ===
        modalImage.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Предотвращаем всплытие события
            const touches = e.touches;
            
            if (touches.length === 1) {
                // Одно касание - начало перетаскивания или двойного тапа
                initialX = touches[0].clientX - translateX;
                initialY = touches[0].clientY - translateY;
                isDragging = scale > 1; // Перетаскиваем только если увеличено
                
                // Проверка на двойной тап
                const currentTime = new Date().getTime();
                if (currentTime - lastTouchTime < 300) {
                    // Двойной тап - переключение зума
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (scale === 1) {
                        // Зумим к точке касания
                        const rect = modalImage.getBoundingClientRect();
                        const touchX = touches[0].clientX - rect.left - rect.width / 2;
                        const touchY = touches[0].clientY - rect.top - rect.height / 2;
                        
                        scale = 2;
                        translateX = -touchX * (scale - 1);
                        translateY = -touchY * (scale - 1);
                        modalImage.classList.add('zoomed');
                    } else {
                        resetZoom();
                    }
                    applyTransform();
                    return false; // Полностью блокируем событие
                }
                lastTouchTime = currentTime;
            } else if (touches.length === 2) {
                // Два касания - начало pinch zoom
                isPinching = true;
                initialDistance = Math.hypot(
                    touches[0].clientX - touches[1].clientX,
                    touches[0].clientY - touches[1].clientY
                );
                initialScale = scale;
            }
        }, { passive: false }); // Важно: passive: false для preventDefault
        
        modalImage.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touches = e.touches;
            
            if (touches.length === 1 && isDragging && !isPinching) {
                // Перетаскивание
                translateX = touches[0].clientX - initialX;
                translateY = touches[0].clientY - initialY;
                applyTransform();
            } else if (touches.length === 2 && isPinching) {
                // Pinch zoom
                const distance = Math.hypot(
                    touches[0].clientX - touches[1].clientX,
                    touches[0].clientY - touches[1].clientY
                );
                scale = Math.max(0.5, Math.min(4, initialScale * (distance / initialDistance)));
                
                if (scale > 1) {
                    modalImage.classList.add('zoomed');
                } else {
                    modalImage.classList.remove('zoomed');
                }
                
                applyTransform();
            }
        }, { passive: false });
        
        modalImage.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isPinching = false;
            isDragging = false;
            
            // Если масштаб слишком мал, сбрасываем
            if (scale < 1) {
                resetZoom();
            }
        }, { passive: false });
        
        // Блокируем события на контейнере модального окна
        modalBody.addEventListener('touchstart', (e) => {
            if (e.target !== modalImage) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false });
        
        modalBody.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        modalBody.addEventListener('touchend', (e) => {
            if (e.target !== modalImage) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false });
        
        // === MOUSE EVENTS для десктопа ===
        modalImage.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const rect = modalImage.getBoundingClientRect();
            
            // Вычисляем позицию курсора относительно изображения
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const prevScale = scale;
            scale = Math.max(0.5, Math.min(4, scale + delta));
            
            if (scale > 1) {
                modalImage.classList.add('zoomed');
                // Зумим к точке курсора, но корректируем для границ изображения
                const scaleDiff = scale - prevScale;
                translateX -= x * scaleDiff;
                translateY -= y * scaleDiff;
                
                // Ограничиваем перемещение границами изображения
                const maxTranslateX = (rect.width * (scale - 1)) / 2;
                const maxTranslateY = (rect.height * (scale - 1)) / 2;
                translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
                translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
            } else {
                modalImage.classList.remove('zoomed');
                if (scale <= 1) {
                    scale = 1;
                    translateX = 0;
                    translateY = 0;
                }
            }
            
            applyTransform();
        });
        
        // Перетаскивание мышью
        modalImage.addEventListener('mousedown', (e) => {
            if (scale > 1) {
                e.preventDefault();
                isDragging = true;
                initialX = e.clientX - translateX;
                initialY = e.clientY - translateY;
                modalImage.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && scale > 1) {
                translateX = e.clientX - initialX;
                translateY = e.clientY - initialY;
                applyTransform();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                modalImage.style.cursor = scale > 1 ? 'grab' : 'default';
            }
        });
        
        // Двойной клик для зума на десктопе
        modalImage.addEventListener('dblclick', (e) => {
            e.preventDefault();
            
            if (scale === 1) {
                // Зумим к точке клика
                const rect = modalImage.getBoundingClientRect();
                const clickX = e.clientX - rect.left - rect.width / 2;
                const clickY = e.clientY - rect.top - rect.height / 2;
                
                scale = 2;
                translateX = -clickX * (scale - 1);
                translateY = -clickY * (scale - 1);
                modalImage.classList.add('zoomed');
            } else {
                resetZoom();
            }
            applyTransform();
        });
        
        // Сброс при открытии нового изображения
        const originalOpenImageModal = this.openImageModal.bind(this);
        this.openImageModal = function(imageSrc) {
            resetZoom();
            originalOpenImageModal(imageSrc);
        };
    }

    // Настройки и Google интеграция
    setupSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');

        // Закрытие модального окна при клике на фон
        settingsModal?.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeSettingsModal();
            }
        });

        // Закрытие модального окна Notion интеграции при клике на фон
        const notionIntegrationModal = document.getElementById('notionIntegrationModal');
        notionIntegrationModal?.addEventListener('click', (e) => {
            if (e.target === notionIntegrationModal) {
                if (typeof closeNotionIntegrationModal === 'function') {
                    closeNotionIntegrationModal();
                }
            }
        });

        // Google Sign In
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignOutBtn = document.getElementById('googleSignOutBtn');

        googleSignInBtn?.addEventListener('click', () => {
            this.googleSignIn();
        });

        googleSignOutBtn?.addEventListener('click', () => {
            this.googleSignOut();
        });
    }

    openSettingsModal() {
        console.log('openSettingsModal called!');
        const settingsModal = document.getElementById('settingsModal');
        console.log('Settings modal found:', settingsModal);
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            console.log('Modal display set to flex');
            // Анимация появления
            setTimeout(() => {
                settingsModal.classList.add('active');
                console.log('Modal active class added');
            }, 10);
        } else {
            console.error('Settings modal NOT found!');
        }
    }

    closeSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('active');
            setTimeout(() => {
                settingsModal.style.display = 'none';
            }, 300);
        }
    }

    saveSettings() {
        // Пока просто закрываем модальное окно
        // В будущем здесь будет сохранение настроек
        console.log('Настройки сохранены');
        this.closeSettingsModal();
    }

    // Методы для соглашения об обслуживании
    openServiceAgreementModal() {
        console.log('=== Opening service agreement modal ===');
        const modal = document.getElementById('serviceAgreementModal');
        console.log('Modal element:', modal);
        console.log('Modal classes before:', modal ? modal.className : 'modal not found');
        console.log('Modal display style:', modal ? modal.style.display : 'modal not found');
        
        if (modal) {
            // Проверяем, не открыто ли уже окно
            if (modal.classList.contains('show') || modal.classList.contains('active')) {
                console.log('Modal is already open, skipping...');
                return;
            }
            
            // Убираем все возможные классы и стили, которые могут мешать
            modal.classList.remove('show', 'active');
            modal.style.display = '';
            
            // Добавляем задержку для очистки состояния
            setTimeout(() => {
                // Принудительно добавляем класс show
                modal.classList.add('show');
                console.log('Modal classes after:', modal.className);
                console.log('Service agreement modal show class added');
            }, 10);
        } else {
            console.error('Service agreement modal not found!');
        }
    }

    closeServiceAgreementModal() {
        console.log('=== Closing service agreement modal ===');
        const modal = document.getElementById('serviceAgreementModal');
        if (modal) {
            console.log('Modal classes before close:', modal.className);
            modal.classList.remove('show', 'active');
            modal.style.display = '';
            console.log('Modal classes after close:', modal.className);
            console.log('Service agreement modal closed successfully');
        } else {
            console.error('Service agreement modal not found when trying to close!');
        }
    }

    // Получение текущего языка
    getCurrentLanguage() {
        // Проверяем сохраненный язык в localStorage
        const savedLang = localStorage.getItem('premium-chat-language');
        if (savedLang && ['ru', 'en', 'be', 'uk'].includes(savedLang)) {
            return savedLang;
        }
        
        // Определяем язык по браузеру
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('ru')) return 'ru';
        if (browserLang.startsWith('be')) return 'be';
        if (browserLang.startsWith('uk')) return 'uk';
        if (browserLang.startsWith('en')) return 'en';
        
        // По умолчанию русский
        return 'ru';
    }

    // Методы для условий использования
    async openTermsOfServiceModal() {
        console.log('=== Opening terms of service modal ===');
        const modal = document.getElementById('termsOfServiceModal');
        console.log('Terms modal element:', modal);
        
        if (modal) {
            try {
                // Убираем проверку на уже открытое окно - разрешаем перезагрузку контента
                
                // Загружаем данные из JSON файла
                console.log('Fetching terms_of_service.json...');
                const response = await fetch('/static/terms_of_service.json');
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Terms data loaded:', data);
                const currentLang = this.getCurrentLanguage();
                console.log('Current language for terms:', currentLang);
                
                // Заполняем модальное окно с учетом языка
                const title = data.title[currentLang] || data.title.ru;
                const lastUpdated = data.lastUpdated[currentLang] || data.lastUpdated.ru;
                
                console.log('Terms title:', title);
                console.log('Terms lastUpdated:', lastUpdated);
                
                const titleElement = document.getElementById('termsTitle');
                const lastUpdatedElement = document.getElementById('termsLastUpdated');
                
                console.log('Title element:', titleElement);
                console.log('LastUpdated element:', lastUpdatedElement);
                
                if (titleElement) {
                    titleElement.textContent = title;
                    console.log('Title set to:', titleElement.textContent);
                }
                
                if (lastUpdatedElement) {
                    lastUpdatedElement.textContent = `${currentLang === 'en' ? 'Last updated:' : currentLang === 'be' ? 'Апошняе абнаўленне:' : currentLang === 'uk' ? 'Останнє оновлення:' : 'Последнее обновление:'} ${lastUpdated}`;
                    console.log('LastUpdated set to:', lastUpdatedElement.textContent);
                }
                
                const sectionsContainer = document.getElementById('termsSections');
                console.log('Sections container:', sectionsContainer);
                
                if (sectionsContainer) {
                    sectionsContainer.innerHTML = '';
                    console.log('Sections container cleared');
                    
                    console.log('Processing sections:', data.sections.length);
                    data.sections.forEach((section, index) => {
                        const sectionTitle = section.title[currentLang] || section.title.ru;
                        const sectionContent = section.content[currentLang] || section.content.ru;
                        
                        console.log(`Section ${index}:`, sectionTitle);
                        
                        const sectionElement = document.createElement('div');
                        sectionElement.className = 'legal-section';
                        sectionElement.innerHTML = `
                            <h3>${sectionTitle}</h3>
                            <p>${sectionContent.replace(/\n/g, '<br>')}</p>
                        `;
                        sectionsContainer.appendChild(sectionElement);
                        console.log(`Section ${index} added to container`);
                    });
                    
                    console.log('All sections processed, container HTML:', sectionsContainer.innerHTML.substring(0, 200) + '...');
                } else {
                    console.error('Terms sections container not found!');
                }
                
                // Показываем модальное окно с правильным классом
                modal.classList.remove('show', 'active');
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                    console.log('Terms modal show class added');
                }, 10);
                
            } catch (error) {
                console.error('Ошибка загрузки условий использования:', error);
                this.showNotification('Ошибка загрузки условий использования', 'error');
            }
        } else {
            console.error('Terms of service modal not found!');
        }
    }

    closeTermsOfServiceModal() {
        console.log('=== Closing terms of service modal ===');
        const modal = document.getElementById('termsOfServiceModal');
        if (modal) {
            console.log('Terms modal classes before close:', modal.className);
            modal.classList.remove('show', 'active');
            // Правильно скрываем модальное окно
            setTimeout(() => {
                modal.style.display = 'none';
                console.log('Terms modal display set to none (method)');
            }, 200); // Ждем завершения анимации
            console.log('Terms modal classes after close:', modal.className);
            console.log('Terms modal closed successfully');
        } else {
            console.error('Terms of service modal not found when trying to close!');
        }
    }

    // Методы для политики конфиденциальности
    async openPrivacyPolicyModal() {
        console.log('=== Opening privacy policy modal ===');
        const modal = document.getElementById('privacyPolicyModal');
        console.log('Privacy modal element:', modal);
        
        if (modal) {
            try {
                // Убираем проверку на уже открытое окно - разрешаем перезагрузку контента
                
                // Загружаем данные из JSON файла
                console.log('Fetching privacy_policy.json...');
                const response = await fetch('/static/privacy_policy.json');
                console.log('Privacy response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Privacy data loaded:', data);
                const currentLang = this.getCurrentLanguage();
                console.log('Current language for privacy policy:', currentLang);
                
                // Заполняем модальное окно с учетом языка
                const title = data.title[currentLang] || data.title.ru;
                const lastUpdated = data.lastUpdated[currentLang] || data.lastUpdated.ru;
                
                console.log('Privacy title:', title);
                console.log('Privacy lastUpdated:', lastUpdated);
                
                const titleElement = document.getElementById('privacyTitle');
                const lastUpdatedElement = document.getElementById('privacyLastUpdated');
                
                console.log('Privacy title element:', titleElement);
                console.log('Privacy lastUpdated element:', lastUpdatedElement);
                
                if (titleElement) {
                    titleElement.textContent = title;
                    console.log('Privacy title set to:', titleElement.textContent);
                }
                
                if (lastUpdatedElement) {
                    lastUpdatedElement.textContent = `${currentLang === 'en' ? 'Last updated:' : currentLang === 'be' ? 'Апошняе абнаўленне:' : currentLang === 'uk' ? 'Останнє оновлення:' : 'Последнее обновление:'} ${lastUpdated}`;
                    console.log('Privacy lastUpdated set to:', lastUpdatedElement.textContent);
                }
                
                const sectionsContainer = document.getElementById('privacySections');
                console.log('Privacy sections container:', sectionsContainer);
                
                if (sectionsContainer) {
                    sectionsContainer.innerHTML = '';
                    console.log('Privacy sections container cleared');
                    
                    console.log('Processing privacy sections:', data.sections.length);
                    data.sections.forEach((section, index) => {
                        const sectionTitle = section.title[currentLang] || section.title.ru;
                        const sectionContent = section.content[currentLang] || section.content.ru;
                        
                        console.log(`Privacy section ${index}:`, sectionTitle);
                        
                        const sectionElement = document.createElement('div');
                        sectionElement.className = 'legal-section';
                        sectionElement.innerHTML = `
                            <h3>${sectionTitle}</h3>
                            <p>${sectionContent.replace(/\n/g, '<br>')}</p>
                        `;
                        sectionsContainer.appendChild(sectionElement);
                        console.log(`Privacy section ${index} added to container`);
                    });
                    
                    console.log('All privacy sections processed, container HTML:', sectionsContainer.innerHTML.substring(0, 200) + '...');
                } else {
                    console.error('Privacy sections container not found!');
                }
                
                // Показываем модальное окно с правильным классом
                modal.classList.remove('show', 'active');
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                    console.log('Privacy modal show class added');
                }, 10);
                
            } catch (error) {
                console.error('Ошибка загрузки политики конфиденциальности:', error);
                this.showNotification('Ошибка загрузки политики конфиденциальности', 'error');
            }
        } else {
            console.error('Privacy policy modal not found!');
        }
    }

    closePrivacyPolicyModal() {
        console.log('=== Closing privacy policy modal ===');
        const modal = document.getElementById('privacyPolicyModal');
        if (modal) {
            console.log('Privacy modal classes before close:', modal.className);
            modal.classList.remove('show', 'active');
            // Правильно скрываем модальное окно
            setTimeout(() => {
                modal.style.display = 'none';
                console.log('Privacy modal display set to none (method)');
            }, 200); // Ждем завершения анимации
            console.log('Privacy modal classes after close:', modal.className);
            console.log('Privacy modal closed successfully');
        } else {
            console.error('Privacy policy modal not found when trying to close!');
        }
    }

    // Инициализация версии приложения
    initializeAppVersion() {
        const versionElement = document.getElementById('appVersion');
        if (versionElement) {
            // Получаем версию из скрипта (можно также из переменной окружения или API)
            const version = '1.0.0';
            versionElement.textContent = version;
        }
    }

    async googleSignIn() {
        try {
            console.log('Инициализация Google Sign In...');
            
            // Получаем URL для авторизации от сервера
            const response = await this.safeFetch('/auth/google/', {
                method: 'GET'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Открываем popup окно для авторизации Google
                const popup = window.open(
                    data.auth_url,
                    'google-auth',
                    'width=500,height=600,scrollbars=yes,resizable=yes'
                );
                
                // Ждем закрытия popup и проверяем результат
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        // Проверяем URL параметры на успех
                        this.checkGoogleAuthResult();
                    }
                }, 1000);
                
            } else {
                throw new Error(data.error || 'Ошибка инициализации Google OAuth');
            }
            
        } catch (error) {
            console.error('Google Sign In error:', error);
            this.showNotification('Ошибка входа через Google: ' + error.message, 'error');
        }
    }

    checkGoogleAuthResult() {
        // Проверяем URL параметры после возврата от Google
        const urlParams = new URLSearchParams(window.location.search);
        const authResult = urlParams.get('google_auth');
        
        if (authResult === 'success') {
            // Успешная авторизация
            this.loadUserProfile();
            this.showNotification('Успешный вход через Google!', 'success');
            
            // Очищаем URL параметры
            window.history.replaceState({}, document.title, window.location.pathname);
            
        } else if (authResult === 'error') {
            // Ошибка авторизации
            this.showNotification('Ошибка авторизации через Google', 'error');
            
            // Очищаем URL параметры
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async checkUserAuthStatus() {
        try {
            // Проверяем, авторизован ли пользователь
            const response = await this.safeFetch('/api/user/auth-status/', {
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.authenticated) {
                    const user = data.user;
                    const profile = data.profile;
                    
                    // Обновляем Email в настройках
                    const userEmailDisplay = document.getElementById('userEmailDisplay');
                    if (userEmailDisplay && user.email) {
                        userEmailDisplay.textContent = user.email;
                    }
                    
                    // Если у пользователя есть Google данные, показываем их
                    if (profile.google_id) {
                        this.showGoogleSignedIn({
                            name: profile.display_name || user.first_name + ' ' + user.last_name || user.username,
                            email: user.email,
                            avatar: profile.google_picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c'
                        });
                    } else {
                        // Пользователь авторизован, но не через Google
                        const displayName = user.first_name + ' ' + user.last_name || user.username;
                        this.updateUserName(displayName.trim() || 'Пользователь');
                        
                        // Показываем состояние "не подключено" для Google
                        this.showGoogleSignedOut();
                    }
                } else {
                    // Пользователь не авторизован - показываем состояние "не подключено"
                    this.showGoogleSignedOut();
                }
            }
        } catch (error) {
            console.log('User not authenticated or error:', error);
            // Показываем состояние "не авторизован"
            this.showGoogleSignedOut();
        }
    }

    async loadUserProfile() {
        try {
            // Загружаем профиль пользователя с сервера
            const response = await this.safeFetch('/api/profiles/', {
                method: 'GET'
            });
            
            if (response.ok) {
                const profiles = await response.json();
                if (profiles.length > 0) {
                    const profile = profiles[0];
                    
                    // Отображаем информацию о пользователе
                    this.showGoogleSignedIn({
                        name: profile.display_name || profile.user.first_name + ' ' + profile.user.last_name,
                        email: profile.user.email,
                        avatar: profile.google_picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c'
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async googleSignOut() {
        try {
            // Отправляем запрос на выход
            const response = await this.safeFetch('/auth/google/logout/', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Используем функцию для показа состояния "не подключено"
                this.showGoogleSignedOut();
                
                // Сбрасываем аватар на иконку по умолчанию
                this.resetUserAvatar();
                
                this.showNotification('Вы вышли из Google аккаунта', 'success');
            } else {
                throw new Error(data.error || 'Ошибка при выходе');
            }
            
        } catch (error) {
            console.error('Google Sign Out error:', error);
            this.showNotification('Ошибка при выходе из аккаунта', 'error');
        }
    }

    showGoogleSignedIn(userData) {
        const googleStatusText = document.getElementById('googleStatusText');
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignOutBtn = document.getElementById('googleSignOutBtn');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        
        // Обновляем статус подключения
        if (googleStatusText) {
            googleStatusText.textContent = 'Подключено';
        }
        
        // Скрываем кнопку входа и показываем кнопку выхода
        if (googleSignInBtn) {
            googleSignInBtn.style.display = 'none';
        }
        if (googleSignOutBtn) {
            googleSignOutBtn.style.display = 'block';
        }
        
        // Обновляем email
        if (userEmailDisplay && userData.email) {
            userEmailDisplay.textContent = userData.email;
        }
        
        // Обновляем имя пользователя в сайдбаре
        this.updateUserName(userData.name);
        
        // Обновляем аватар в сайдбаре
        this.updateUserAvatar(userData.avatar);
        
        this.showNotification('Успешный вход через Google', 'success');
    }

    showGoogleSignedOut() {
        const googleStatusText = document.getElementById('googleStatusText');
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignOutBtn = document.getElementById('googleSignOutBtn');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        
        // Обновляем статус подключения
        if (googleStatusText) {
            googleStatusText.textContent = 'Не подключено';
        }
        
        // Показываем кнопку входа и скрываем кнопку выхода
        if (googleSignInBtn) {
            googleSignInBtn.style.display = 'block';
        }
        if (googleSignOutBtn) {
            googleSignOutBtn.style.display = 'none';
        }
        
        // Сбрасываем email
        if (userEmailDisplay) {
            userEmailDisplay.textContent = 'Не указан';
        }
        
        // Сбрасываем имя пользователя в сайдбаре
        this.updateUserName('Пользователь');
        
        console.log('Google user signed out');
    }

    updateUserName(name) {
        const userName = document.querySelector('.user-name');
        if (userName) {
            userName.textContent = name;
        }
    }

    updateUserAvatar(avatarUrl) {
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar && avatarUrl) {
            // Заменяем иконку на изображение
            userAvatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Avatar';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            userAvatar.appendChild(img);
        }
    }

    resetUserAvatar() {
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            // Возвращаем иконку по умолчанию
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
    }

    showNotification(message, type = 'info') {
        // Создаем красивое уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Добавляем стили если их нет
        if (!document.querySelector('.notification-styles')) {
            const styles = document.createElement('style');
            styles.className = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2a2a2a;
                    border: 1px solid #404040;
                    border-radius: 8px;
                    padding: 12px 16px;
                    max-width: 300px;
                    z-index: 10000;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                }
                .notification.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                .notification-success { border-left: 4px solid #10a37f; }
                .notification-error { border-left: 4px solid #dc3545; }
                .notification-info { border-left: 4px solid #17a2b8; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #ffffff;
                    font-size: 14px;
                }
                .notification i {
                    flex-shrink: 0;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Показываем с анимацией
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Автоматически скрываем через 4 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
        
        // Также выводим в консоль
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    // Обновление интерфейса при смене языка
    updateInterfaceLanguage() {
        console.log('=== Updating interface language ===');
        
        // Обновляем модальные окна с правовыми документами, если они открыты
        const termsModal = document.getElementById('termsOfServiceModal');
        const privacyModal = document.getElementById('privacyPolicyModal');
        
        // Проверяем более тщательно состояние модальных окон
        const isTermsModalOpen = termsModal && (
            termsModal.style.display === 'flex' || 
            termsModal.classList.contains('show') || 
            termsModal.classList.contains('active') ||
            getComputedStyle(termsModal).display === 'flex'
        );
        
        const isPrivacyModalOpen = privacyModal && (
            privacyModal.style.display === 'flex' || 
            privacyModal.classList.contains('show') || 
            privacyModal.classList.contains('active') ||
            getComputedStyle(privacyModal).display === 'flex'
        );
        
        if (isTermsModalOpen) {
            console.log('Terms modal is open, reloading content with new language...');
            // Принудительно перезагружаем содержимое
            this.closeTermsOfServiceModal();
            setTimeout(() => {
                this.openTermsOfServiceModal();
            }, 100);
        }
        
        if (isPrivacyModalOpen) {
            console.log('Privacy modal is open, reloading content with new language...');
            // Принудительно перезагружаем содержимое
            this.closePrivacyPolicyModal();
            setTimeout(() => {
                this.openPrivacyPolicyModal();
            }, 100);
        }
        
        // Обновляем статистику достижений, если модальное окно открыто
        const statsModal = document.getElementById('statsModal');
        if (statsModal && (statsModal.style.display === 'flex' || statsModal.classList.contains('active'))) {
            console.log('Stats modal is open, updating achievements...');
            this.updateStatsModal();
        }
        
        console.log('Interface language update completed');
    }
}

// Глобальные функции для модального окна настроек
function closeSettingsModal() {
    if (window.chatApp) {
        window.chatApp.closeSettingsModal();
    }
}

function saveSettings() {
    if (window.chatApp) {
        window.chatApp.saveSettings();
    }
}

// Глобальные функции для Google OAuth (для HTML onclick)
function signInWithGoogle() {
    if (window.chatApp) {
        window.chatApp.googleSignIn();
    }
}

function signOutFromGoogle() {
    if (window.chatApp) {
        window.chatApp.googleSignOut();
    }
}

// Font size management
let currentFontSize = 'default'; // 'tiny', 'small', 'default', 'large', 'huge'

// Функция для получения локализованного названия размера шрифта
function getLocalizedFontSizeName(size) {
    if (window.localizationManager) {
        switch (size) {
            case 'tiny': return window.localizationManager.translate('very_small');
            case 'small': return window.localizationManager.translate('small');
            case 'default': return window.localizationManager.translate('default');
            case 'large': return window.localizationManager.translate('large');
            case 'huge': return window.localizationManager.translate('very_large');
            default: return window.localizationManager.translate('default');
        }
    }
    // Fallback на русский
    const fallbackNames = {
        'tiny': 'Очень маленький',
        'small': 'Маленький', 
        'default': 'По умолчанию',
        'large': 'Большой',
        'huge': 'Очень большой'
    };
    return fallbackNames[size] || fallbackNames['default'];
}

function updateFontSizeSettingText() {
    const el = document.getElementById('fontSizeSettingText');
    if (el) {
        el.textContent = getLocalizedFontSizeName(currentFontSize);
    }
}

const fontSizes = {
    'tiny': { scale: 0.75 },
    'small': { scale: 0.9 },
    'default': { scale: 1.0 },
    'large': { scale: 1.2 },
    'huge': { scale: 1.5 }
};

function openFontSettingsModal() {
    console.log('=== Opening font settings modal ===');
    const modal = document.getElementById('fontSettingsModal');
    const slider = document.getElementById('fontSizeSlider');
    const valueDisplay = document.getElementById('fontSliderValue');
    
    console.log('Modal element:', modal);
    console.log('Modal classes before:', modal ? modal.className : 'modal not found');
    console.log('Modal display style:', modal ? modal.style.display : 'modal not found');
    
    if (modal) {
        // Проверяем, не открыто ли уже окно (но не по классу, а по реальному состоянию)
        const isReallyOpen = window.getComputedStyle(modal).display !== 'none' && modal.classList.contains('show');
        if (isReallyOpen) {
            console.log('Modal is really open, skipping...');
            return;
        }
        
        // Убираем все возможные классы и стили
        modal.classList.remove('show', 'active');
        modal.style.display = '';
        
        // Добавляем задержку для очистки состояния
        setTimeout(() => {
            // Принудительно добавляем класс show
            modal.classList.add('show');
            console.log('Modal classes after:', modal.className);
            console.log('Font settings modal show class added');
            
            // Set current font size on slider
            if (slider && valueDisplay) {
                const sizes = ['tiny', 'small', 'default', 'large', 'huge'];
                const currentIndex = sizes.indexOf(currentFontSize);
                slider.value = currentIndex;
                valueDisplay.textContent = getLocalizedFontSizeName(currentFontSize);
                console.log('Slider value set to:', currentIndex, 'Font size:', getLocalizedFontSizeName(currentFontSize));
            }
            
            // Пересоздаем event listeners для ползунка после открытия модального окна
            setTimeout(() => {
                console.log('Re-setting up font slider after modal open...');
                setupFontSlider();
                
                // Update preview after modal is shown
                setTimeout(() => {
                    console.log('Updating font preview after modal is shown...');
                    updateFontPreview();
                }, 50);
            }, 100);
        }, 10);
    } else {
        console.error('Font settings modal not found!');
    }
}

function closeFontSettingsModal() {
    console.log('=== Closing font settings modal ===');
    const modal = document.getElementById('fontSettingsModal');
    if (modal) {
        console.log('Modal classes before close:', modal.className);
        modal.classList.remove('show', 'active');
        modal.style.display = '';
        console.log('Modal classes after close:', modal.className);
        console.log('Font settings modal closed successfully');
    } else {
        console.error('Font settings modal not found when trying to close!');
    }
}

// Setup font settings modal
function setupFontSettingsModal() {
    console.log('=== Setting up font settings modal ===');
    const fontModal = document.getElementById('fontSettingsModal');
    
    if (fontModal) {
        console.log('Font modal found, setting up event listeners');
        
        // Убираем старые event listeners, если они есть
        const newFontModal = fontModal.cloneNode(true);
        fontModal.parentNode.replaceChild(newFontModal, fontModal);
        
        // Получаем новую ссылку на элемент
        const modal = document.getElementById('fontSettingsModal');
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            console.log('Font modal clicked, target:', e.target, 'currentTarget:', e.currentTarget);
            if (e.target === modal) {
                console.log('Closing font modal via overlay click');
                closeFontSettingsModal();
            }
        });
        
        // Setup close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('Font modal close button clicked');
                closeFontSettingsModal();
            });
        }
        
        console.log('Font modal event listeners setup complete');
    } else {
        console.error('Font modal not found during setup!');
    }
}

function updateFontPreview() {
    const fontConfig = fontSizes[currentFontSize];
    const previewContainer = document.querySelector('.font-preview-container');
    
    console.log('updateFontPreview called with:', currentFontSize, fontConfig);
    console.log('Preview container found:', !!previewContainer);
    
    if (previewContainer) {
        // Применяем масштаб шрифта к предпросмотру
        const baseFontSize = 14; // Базовый размер шрифта для предпросмотра
        const newFontSize = (baseFontSize * fontConfig.scale) + 'px';
        
        console.log('Applying font size to preview:', newFontSize);
        
        // Применяем к контейнеру предпросмотра
        previewContainer.style.fontSize = newFontSize;
        
        // Также применяем к всем вложенным элементам для гарантии
        const messages = previewContainer.querySelectorAll('.message');
        messages.forEach(message => {
            message.style.fontSize = newFontSize;
        });
        
        const messageContents = previewContainer.querySelectorAll('.message-content');
        messageContents.forEach(content => {
            content.style.fontSize = newFontSize;
        });
        
        const messageParagraphs = previewContainer.querySelectorAll('.message-content p');
        messageParagraphs.forEach(p => {
            p.style.fontSize = newFontSize;
        });
        
        // Дополнительно применяем ко всем текстовым элементам
        const allTextElements = previewContainer.querySelectorAll('*');
        allTextElements.forEach(element => {
            if (element.textContent && element.textContent.trim()) {
                element.style.fontSize = newFontSize;
            }
        });
        
        console.log('Font preview updated to:', currentFontSize, 'scale:', fontConfig.scale, 'size:', newFontSize);
        console.log('Applied to elements:', {
            container: !!previewContainer,
            messages: messages.length,
            messageContents: messageContents.length,
            paragraphs: messageParagraphs.length,
            allElements: allTextElements.length
        });
    } else {
        console.error('Font preview container not found!');
        console.log('Available containers:', document.querySelectorAll('[class*="preview"]'));
    }
}

function resetFontSize() {
    currentFontSize = 'default';
    const slider = document.getElementById('fontSizeSlider');
    const valueDisplay = document.getElementById('fontSliderValue');
    
    if (slider) slider.value = 2; // default is now at index 2
    if (valueDisplay) valueDisplay.textContent = getLocalizedFontSizeName(currentFontSize);
    
    applyFontSize();
    updateFontPreview();
    updateFontSizeSettingText();
}

function applyFontSize() {
    const fontConfig = fontSizes[currentFontSize];
    
    console.log('=== Applying font size ===');
    console.log('Current font size:', currentFontSize);
    console.log('Font config:', fontConfig);
    
    // Apply font size to the entire app
    const newRootFontSize = (16 * fontConfig.scale) + 'px';
    document.documentElement.style.fontSize = newRootFontSize;
    
    console.log('Applied root font size:', newRootFontSize);
    console.log('Document root fontSize after:', document.documentElement.style.fontSize);
    console.log('Computed root fontSize:', window.getComputedStyle(document.documentElement).fontSize);
    
    // Save to localStorage
    localStorage.setItem('premium-chat-font-size', currentFontSize);
    updateFontSizeSettingText();
    console.log('Font size changed to:', getLocalizedFontSizeName(currentFontSize));
}

function loadFontSize() {
    const saved = localStorage.getItem('premium-chat-font-size');
    if (saved && fontSizes[saved]) {
        currentFontSize = saved;
        applyFontSize();
        updateFontSizeSettingText();
    } else {
        updateFontSizeSettingText();
    }
}

// Setup font slider event listener
function setupFontSlider() {
    const slider = document.getElementById('fontSizeSlider');
    const valueDisplay = document.getElementById('fontSliderValue');
    
    if (slider && valueDisplay) {
        // Убираем старые event listeners
        const newSlider = slider.cloneNode(true);
        slider.parentNode.replaceChild(newSlider, slider);
        
        // Получаем новую ссылку на элемент
        const updatedSlider = document.getElementById('fontSizeSlider');
        const updatedValueDisplay = document.getElementById('fontSliderValue');
        
        if (updatedSlider && updatedValueDisplay) {
            updatedSlider.addEventListener('input', function(e) {
                console.log('Font slider input event fired, value:', this.value);
                const sizes = ['tiny', 'small', 'default', 'large', 'huge'];
                const selectedIndex = parseInt(this.value);
                currentFontSize = sizes[selectedIndex];
                
                console.log('Font size changed to:', currentFontSize);
                
                updatedValueDisplay.textContent = getLocalizedFontSizeName(currentFontSize);
                applyFontSize();
                
                // Вызываем updateFontPreview с задержкой для стабильности
                setTimeout(() => {
                    console.log('Calling updateFontPreview from slider...');
                    updateFontPreview();
                }, 10);
                
                updateFontSizeSettingText();
            });
            
            // Также добавляем event listener на 'change' для надежности
            updatedSlider.addEventListener('change', function(e) {
                console.log('Font slider change event fired, value:', this.value);
                const sizes = ['tiny', 'small', 'default', 'large', 'huge'];
                const selectedIndex = parseInt(this.value);
                currentFontSize = sizes[selectedIndex];
                
                console.log('Font size changed to (via change):', currentFontSize);
                
                updatedValueDisplay.textContent = getLocalizedFontSizeName(currentFontSize);
                applyFontSize();
                updateFontPreview();
                updateFontSizeSettingText();
            });
            
            console.log('Font slider event listener setup successfully');
        }
    } else {
        console.error('Font slider or value display not found!');
    }
}

// Setup settings modal event listeners
function setupSettingsModal() {
    const settingsBtn = document.getElementById('settingsMenuBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsOverlay = settingsModal;
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'flex';
            }
        });
    }
    
    // Close on overlay click
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) {
                settingsModal.style.display = 'none';
            }
        });
    }
}

// Global functions for onclick events
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем локализацию первой
    if (window.localizationManager) {
        window.localizationManager.init();
    }
    
    // Сначала сбрасываем все модальные окна в начальное состояние
    resetAllModals();
    
    window.chatApp = new PremiumChatApp();
    loadFontSize(); // Load saved font size
    
    // Инициализируем состояние Notion интеграции
    if (typeof loadNotionIntegrationState === 'function') {
        loadNotionIntegrationState();
    }
    
    // Add global escape key handler for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            console.log('Escape key pressed, closing modals');
            // Close any open modals
            closeFontSettingsModal();
            closeDataManagementModal();
            closeSettingsModal();
            if (window.closeServiceAgreementModal) {
                window.closeServiceAgreementModal();
            }
            if (window.closeTermsOfServiceModal) {
                window.closeTermsOfServiceModal();
            }
            if (window.closePrivacyPolicyModal) {
                window.closePrivacyPolicyModal();
            }
            if (window.closeLanguageModal) {
                window.closeLanguageModal();
            }
            if (window.closeNotionIntegrationModal) {
                window.closeNotionIntegrationModal();
            }
        }
    });
    
    // Setup modals after DOM is loaded
    setTimeout(() => {
        setupFontSlider(); // Setup font slider
        setupSettingsModal(); // Setup settings modal
        setupFontSettingsModal(); // Setup font settings modal
        setupDataManagementModal(); // Setup data management modal
        setupServiceAgreementModal(); // Setup service agreement modal
        
        // Тестовая проверка - убедимся что ползунок существует
        const testSlider = document.getElementById('fontSizeSlider');
        console.log('Font slider found on initialization:', !!testSlider);
        if (testSlider) {
            console.log('Slider attributes:', {
                min: testSlider.min,
                max: testSlider.max,
                step: testSlider.step,
                value: testSlider.value,
                className: testSlider.className
            });
        }
    }, 100);
});

// Service Agreement Modal Functions
function setupServiceAgreementModal() {
    console.log('=== Setting up service agreement modal ===');
    const serviceModal = document.getElementById('serviceAgreementModal');
    
    if (serviceModal) {
        console.log('Service agreement modal found, setting up event listeners');
        
        // Close on overlay click
        serviceModal.addEventListener('click', (e) => {
            console.log('Service agreement modal clicked, target:', e.target, 'currentTarget:', e.currentTarget);
            if (e.target === serviceModal) {
                console.log('Closing service agreement modal via overlay click');
                window.closeServiceAgreementModal();
            }
        });
        
        console.log('Service agreement modal event listeners setup complete');
    } else {
        console.error('Service agreement modal not found during setup!');
    }
}

// Data Management Modal Functions
function openDataManagementModal() {
    console.log('=== Opening data management modal ===');
    const modal = document.getElementById('dataManagementModal');
    
    console.log('Modal element:', modal);
    console.log('Modal classes before:', modal ? modal.className : 'modal not found');
    console.log('Modal display style:', modal ? modal.style.display : 'modal not found');
    
    if (modal) {
        // Проверяем, не открыто ли уже окно (но не по классу, а по реальному состоянию)
        const isReallyOpen = window.getComputedStyle(modal).display !== 'none' && modal.classList.contains('show');
        if (isReallyOpen) {
            console.log('Data modal is really open, skipping...');
            return;
        }
        
        // Убираем все возможные классы и стили
        modal.classList.remove('show', 'active');
        modal.style.display = '';
        
        // Добавляем задержку для очистки состояния
        setTimeout(() => {
            // Принудительно добавляем класс show
            modal.classList.add('show');
            console.log('Modal classes after:', modal.className);
            console.log('Data management modal show class added');
        }, 10);
    } else {
        console.error('Data management modal not found!');
    }
}

function closeDataManagementModal() {
    console.log('=== Closing data management modal ===');
    const modal = document.getElementById('dataManagementModal');
    if (modal) {
        console.log('Modal classes before close:', modal.className);
        modal.classList.remove('show', 'active');
        modal.style.display = '';
        console.log('Modal classes after close:', modal.className);
        console.log('Data management modal closed successfully');
    } else {
        console.error('Data management modal not found when trying to close!');
    }
}

function setupDataManagementModal() {
    console.log('=== Setting up data management modal ===');
    const dataModal = document.getElementById('dataManagementModal');
    
    if (dataModal) {
        console.log('Data modal found, setting up event listeners');
        
        // Убираем старые event listeners, если они есть
        const newDataModal = dataModal.cloneNode(true);
        dataModal.parentNode.replaceChild(newDataModal, dataModal);
        
        // Получаем новую ссылку на элемент
        const modal = document.getElementById('dataManagementModal');
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            console.log('Data modal clicked, target:', e.target, 'currentTarget:', e.currentTarget);
            if (e.target === modal) {
                console.log('Closing data modal via overlay click');
                closeDataManagementModal();
            }
        });
        
        // Setup close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('Data modal close button clicked');
                closeDataManagementModal();
            });
        }
        
        // Setup training toggle
        const trainingToggle = modal.querySelector('#trainingToggle');
        if (trainingToggle) {
            // Load saved preference
            const saved = localStorage.getItem('allowTraining');
            if (saved !== null) {
                trainingToggle.checked = saved === 'true';
            }
            
            // Save on change
            trainingToggle.addEventListener('change', () => {
                localStorage.setItem('allowTraining', trainingToggle.checked.toString());
            });
        }
        
        console.log('Data modal event listeners setup complete');
    } else {
        console.error('Data modal not found during setup!');
    }
}

async function confirmDeleteAllChats() {
    if (confirm('Вы уверены, что хотите удалить все чаты? Это действие необратимо.')) {
        try {
            const response = await fetch('/api/delete-all-chats/', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.csrfToken
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Успешно удалено ${data.deleted_chats} чатов`);
                // Обновляем список чатов через экземпляр приложения
                if (window.chatApp) {
                    window.chatApp.updateChatList();
                    // Возвращаемся к экрану приветствия
                    window.chatApp.showWelcomeScreen();
                }
                closeDataManagementModal();
            } else {
                alert(`Ошибка при удалении чатов: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting all chats:', error);
            alert('Произошла ошибка при удалении чатов');
        }
    }
}

async function confirmDeleteAccount() {
    const confirmation = prompt('Для подтверждения удаления аккаунта введите "УДАЛИТЬ":');
    if (confirmation === 'УДАЛИТЬ') {
        try {
            const response = await fetch('/api/delete-account/', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.csrfToken
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Аккаунт успешно удален. До свидания!');
                // Перезагружаем страницу для полной очистки
                window.location.reload();
            } else {
                alert(`Ошибка при удалении аккаунта: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Произошла ошибка при удалении аккаунта');
        }
    } else if (confirmation !== null) {
        alert('Неверное подтверждение. Аккаунт не будет удален.');
    }
}

// Make all functions globally available
window.openDataManagementModal = openDataManagementModal;
window.closeDataManagementModal = closeDataManagementModal;
window.openFontSettingsModal = openFontSettingsModal;
window.closeFontSettingsModal = closeFontSettingsModal;
window.confirmDeleteAllChats = confirmDeleteAllChats;
window.confirmDeleteAccount = confirmDeleteAccount;

// Глобальные функции для новых модальных окон
window.openServiceAgreementModal = function() {
    console.log('=== Global openServiceAgreementModal called ===');
    console.log('window.chatApp exists:', !!window.chatApp);
    
    if (window.chatApp) {
        console.log('Calling chatApp.openServiceAgreementModal()');
        window.chatApp.openServiceAgreementModal();
    } else {
        console.log('window.chatApp not available, trying direct modal opening');
        // Резервный механизм - прямое открытие модального окна
        const modal = document.getElementById('serviceAgreementModal');
        console.log('Modal element found:', !!modal);
        if (modal) {
            console.log('Opening modal directly');
            modal.classList.remove('show', 'active');
            modal.style.display = '';
            setTimeout(() => {
                modal.classList.add('show');
                console.log('Modal show class added directly');
            }, 10);
        } else {
            console.error('Service agreement modal not found!');
        }
    }
};

window.closeServiceAgreementModal = function() {
    console.log('=== Global closeServiceAgreementModal called ===');
    console.log('window.chatApp exists:', !!window.chatApp);
    
    if (window.chatApp) {
        console.log('Calling chatApp.closeServiceAgreementModal()');
        window.chatApp.closeServiceAgreementModal();
    } else {
        console.log('window.chatApp not available, trying direct modal closing');
        // Резервный механизм - прямое закрытие модального окна
        const modal = document.getElementById('serviceAgreementModal');
        console.log('Modal element found:', !!modal);
        if (modal) {
            console.log('Closing modal directly');
            modal.classList.remove('show', 'active');
            modal.style.display = '';
            console.log('Modal closed directly');
        } else {
            console.error('Service agreement modal not found when trying to close!');
        }
    }
};

window.openTermsOfServiceModal = async function() {
    console.log('=== Global openTermsOfServiceModal called ===');
    console.log('window.chatApp exists:', !!window.chatApp);
    
    if (window.chatApp) {
        console.log('Calling chatApp.openTermsOfServiceModal()');
        window.chatApp.openTermsOfServiceModal();
    } else {
        console.log('window.chatApp not available, loading terms data directly');
        // Резервный механизм - прямая загрузка и открытие модального окна
        const modal = document.getElementById('termsOfServiceModal');
        console.log('Terms modal element found:', !!modal);
        if (modal) {
            try {
                // Проверяем, не открыто ли уже окно
                if (modal.classList.contains('show') || modal.classList.contains('active')) {
                    console.log('Terms modal is already open, skipping...');
                    return;
                }
                
                console.log('Loading terms data directly...');
                // Загружаем данные из JSON файла
                const response = await fetch('/static/terms_of_service.json');
                console.log('Terms response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Terms data loaded directly:', data);
                
                // Определяем язык (упрощенно - русский по умолчанию)
                const currentLang = localStorage.getItem('premium-chat-language') || 'ru';
                console.log('Current language for terms (global):', currentLang);
                
                // Заполняем модальное окно с учетом языка
                const title = data.title[currentLang] || data.title.ru;
                const lastUpdated = data.lastUpdated[currentLang] || data.lastUpdated.ru;
                
                console.log('Terms title (global):', title);
                console.log('Terms lastUpdated (global):', lastUpdated);
                
                const titleElement = document.getElementById('termsTitle');
                const lastUpdatedElement = document.getElementById('termsLastUpdated');
                
                if (titleElement) {
                    titleElement.textContent = title;
                    console.log('Terms title set (global):', titleElement.textContent);
                }
                
                if (lastUpdatedElement) {
                    lastUpdatedElement.textContent = `${currentLang === 'en' ? 'Last updated:' : currentLang === 'be' ? 'Апошняе абнаўленне:' : currentLang === 'uk' ? 'Останнє оновлення:' : 'Последнее обновление:'} ${lastUpdated}`;
                    console.log('Terms lastUpdated set (global):', lastUpdatedElement.textContent);
                }
                
                const sectionsContainer = document.getElementById('termsSections');
                console.log('Terms sections container (global):', sectionsContainer);
                
                if (sectionsContainer) {
                    sectionsContainer.innerHTML = '';
                    console.log('Terms sections container cleared (global)');
                    
                    console.log('Processing terms sections (global):', data.sections.length);
                    data.sections.forEach((section, index) => {
                        const sectionTitle = section.title[currentLang] || section.title.ru;
                        const sectionContent = section.content[currentLang] || section.content.ru;
                        
                        console.log(`Terms section ${index} (global):`, sectionTitle);
                        
                        const sectionElement = document.createElement('div');
                        sectionElement.className = 'legal-section';
                        sectionElement.innerHTML = `
                            <h3>${sectionTitle}</h3>
                            <p>${sectionContent.replace(/\n/g, '<br>')}</p>
                        `;
                        sectionsContainer.appendChild(sectionElement);
                        console.log(`Terms section ${index} added (global)`);
                    });
                    
                    console.log('All terms sections processed (global), container HTML:', sectionsContainer.innerHTML.substring(0, 200) + '...');
                } else {
                    console.error('Terms sections container not found (global)!');
                }
                
                // Показываем модальное окно
                console.log('Opening terms modal directly');
                modal.classList.remove('show', 'active');
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                    console.log('Terms modal show class added directly');
                }, 10);
                
            } catch (error) {
                console.error('Ошибка загрузки условий использования (global):', error);
                // Просто показываем пустое модальное окно в случае ошибки
                modal.classList.remove('show', 'active');
                modal.style.display = '';
                setTimeout(() => {
                    modal.classList.add('show');
                    console.log('Terms modal show class added directly (fallback)');
                }, 10);
            }
        } else {
            console.error('Terms of service modal not found!');
        }
    }
};

window.closeTermsOfServiceModal = function() {
    console.log('=== Global closeTermsOfServiceModal called ===');
    console.log('window.chatApp exists:', !!window.chatApp);
    
    if (window.chatApp) {
        console.log('Calling chatApp.closeTermsOfServiceModal()');
        window.chatApp.closeTermsOfServiceModal();
    } else {
        console.log('window.chatApp not available, trying direct terms modal closing');
        // Резервный механизм - прямое закрытие модального окна
        const modal = document.getElementById('termsOfServiceModal');
        console.log('Terms modal element found:', !!modal);
        if (modal) {
            console.log('Closing terms modal directly');
            modal.classList.remove('show', 'active');
            // Правильно скрываем модальное окно
            setTimeout(() => {
                modal.style.display = 'none';
                console.log('Terms modal display set to none');
            }, 200); // Ждем завершения анимации
            console.log('Terms modal closed directly');
        } else {
            console.error('Terms of service modal not found when trying to close!');
        }
    }
};

window.openPrivacyPolicyModal = async function() {
    console.log('=== Global openPrivacyPolicyModal called ===');
    console.log('window.chatApp exists:', !!window.chatApp);
    
    if (window.chatApp) {
        console.log('Calling chatApp.openPrivacyPolicyModal()');
        window.chatApp.openPrivacyPolicyModal();
    } else {
        console.log('window.chatApp not available, loading privacy data directly');
        // Резервный механизм - прямая загрузка и открытие модального окна
        const modal = document.getElementById('privacyPolicyModal');
        console.log('Privacy modal element found:', !!modal);
        if (modal) {
            try {
                // Проверяем, не открыто ли уже окно
                if (modal.classList.contains('show') || modal.classList.contains('active')) {
                    console.log('Privacy modal is already open, skipping...');
                    return;
                }
                
                console.log('Loading privacy data directly...');
                // Загружаем данные из JSON файла
                const response = await fetch('/static/privacy_policy.json');
                console.log('Privacy response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Privacy data loaded directly:', data);
                
                // Определяем язык (упрощенно - русский по умолчанию)
                const currentLang = localStorage.getItem('premium-chat-language') || 'ru';
                console.log('Current language for privacy (global):', currentLang);
                
                // Заполняем модальное окно с учетом языка
                const title = data.title[currentLang] || data.title.ru;
                const lastUpdated = data.lastUpdated[currentLang] || data.lastUpdated.ru;
                
                console.log('Privacy title (global):', title);
                console.log('Privacy lastUpdated (global):', lastUpdated);
                
                const titleElement = document.getElementById('privacyTitle');
                const lastUpdatedElement = document.getElementById('privacyLastUpdated');
                
                if (titleElement) {
                    titleElement.textContent = title;
                    console.log('Privacy title set (global):', titleElement.textContent);
                }
                
                if (lastUpdatedElement) {
                    lastUpdatedElement.textContent = `${currentLang === 'en' ? 'Last updated:' : currentLang === 'be' ? 'Апошняе абнаўленне:' : currentLang === 'uk' ? 'Останнє оновлення:' : 'Последнее обновление:'} ${lastUpdated}`;
                    console.log('Privacy lastUpdated set (global):', lastUpdatedElement.textContent);
                }
                
                const sectionsContainer = document.getElementById('privacySections');
                console.log('Privacy sections container (global):', sectionsContainer);
                
                if (sectionsContainer) {
                    sectionsContainer.innerHTML = '';
                    console.log('Privacy sections container cleared (global)');
                    
                    console.log('Processing privacy sections (global):', data.sections.length);
                    data.sections.forEach((section, index) => {
                        const sectionTitle = section.title[currentLang] || section.title.ru;
                        const sectionContent = section.content[currentLang] || section.content.ru;
                        
                        console.log(`Privacy section ${index} (global):`, sectionTitle);
                        
                        const sectionElement = document.createElement('div');
                        sectionElement.className = 'legal-section';
                        sectionElement.innerHTML = `
                            <h3>${sectionTitle}</h3>
                            <p>${sectionContent.replace(/\n/g, '<br>')}</p>
                        `;
                        sectionsContainer.appendChild(sectionElement);
                        console.log(`Privacy section ${index} added (global)`);
                    });
                    
                    console.log('All privacy sections processed (global), container HTML:', sectionsContainer.innerHTML.substring(0, 200) + '...');
                } else {
                    console.error('Privacy sections container not found (global)!');
                }
                
                // Показываем модальное окно
                console.log('Opening privacy modal directly');
                modal.classList.remove('show', 'active');
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                    console.log('Privacy modal show class added directly');
                }, 10);
                
            } catch (error) {
                console.error('Ошибка загрузки политики конфиденциальности (global):', error);
                // Просто показываем пустое модальное окно в случае ошибки
                modal.classList.remove('show', 'active');
                modal.style.display = '';
                setTimeout(() => {
                    modal.classList.add('show');
                    console.log('Privacy modal show class added directly (fallback)');
                }, 10);
            }
        } else {
            console.error('Privacy policy modal not found!');
        }
    }
};

window.closePrivacyPolicyModal = function() {
    console.log('=== Global closePrivacyPolicyModal called ===');
    console.log('window.chatApp exists:', !!window.chatApp);
    
    if (window.chatApp) {
        console.log('Calling chatApp.closePrivacyPolicyModal()');
        window.chatApp.closePrivacyPolicyModal();
    } else {
        console.log('window.chatApp not available, trying direct privacy modal closing');
        // Резервный механизм - прямое закрытие модального окна
        const modal = document.getElementById('privacyPolicyModal');
        console.log('Privacy modal element found:', !!modal);
        if (modal) {
            console.log('Closing privacy modal directly');
            modal.classList.remove('show', 'active');
            // Правильно скрываем модальное окно
            setTimeout(() => {
                modal.style.display = 'none';
                console.log('Privacy modal display set to none');
            }, 200); // Ждем завершения анимации
            console.log('Privacy modal closed directly');
        } else {
            console.error('Privacy policy modal not found when trying to close!');
        }
    }
};

// Utility function to reset all modal states
function resetAllModals() {
    console.log('=== Resetting all modal states ===');
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.classList.remove('show', 'active');
        modal.style.display = 'none';
        modal.style.opacity = '';
        console.log('Reset modal:', modal.id);
    });
}

// Универсальная функция для открытия модального окна
function openModal(modalId) {
    console.log(`=== Opening modal: ${modalId} ===`);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal ${modalId} not found!`);
        return false;
    }
    
    console.log(`Modal ${modalId} current state:`, {
        classes: modal.className,
        display: modal.style.display,
        computed: window.getComputedStyle(modal).display
    });
    
    // Проверяем, не открыто ли уже окно
    if (modal.classList.contains('show') || modal.classList.contains('active')) {
        console.log(`Modal ${modalId} is already open, skipping...`);
        return false;
    }
    
    // Сначала убираем все классы и восстанавливаем начальное состояние
    modal.classList.remove('show', 'active');
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    
    console.log(`Modal ${modalId} display set to flex`);
    
    // Принудительно добавляем класс show для анимации появления
    requestAnimationFrame(() => {
        modal.classList.add('show');
        console.log(`Modal ${modalId} show class added`);
        console.log(`Modal ${modalId} final state:`, {
            classes: modal.className,
            display: modal.style.display,
            computed: window.getComputedStyle(modal).display
        });
    });
    
    return true;
}

// Универсальная функция для закрытия модального окна
function closeModal(modalId) {
    console.log(`=== Closing modal: ${modalId} ===`);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal ${modalId} not found!`);
        return false;
    }
    
    console.log(`Modal ${modalId} current state before close:`, {
        classes: modal.className,
        display: modal.style.display,
        computed: window.getComputedStyle(modal).display
    });
    
    // Убираем класс show для анимации закрытия
    modal.classList.remove('show', 'active');
    
    // Скрываем модальное окно после анимации
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '';
        console.log(`Modal ${modalId} display set to none`);
        console.log(`Modal ${modalId} final state after close:`, {
            classes: modal.className,
            display: modal.style.display,
            computed: window.getComputedStyle(modal).display
        });
    }, 250); // Подождем немного дольше для завершения анимации
    
    return true;
}

// Make utility function globally available
window.resetAllModals = resetAllModals;
window.openModal = openModal;
window.closeModal = closeModal;
window.openFontSettingsModal = openFontSettingsModal;
window.closeFontSettingsModal = closeFontSettingsModal;
window.openDataManagementModal = openDataManagementModal;
window.closeDataManagementModal = closeDataManagementModal;

// Добавляем тестовые функции для отладки
window.testFontSize = function(size) {
    console.log('Testing font size:', size);
    if (fontSizes[size]) {
        currentFontSize = size;
        applyFontSize();
        updateFontPreview();
        updateFontSizeSettingText();
        
        // Обновляем ползунок если он видим
        const slider = document.getElementById('fontSizeSlider');
        const valueDisplay = document.getElementById('fontSliderValue');
        if (slider && valueDisplay) {
            const sizes = ['tiny', 'small', 'default', 'large', 'huge'];
            const currentIndex = sizes.indexOf(currentFontSize);
            slider.value = currentIndex;
            valueDisplay.textContent = getLocalizedFontSizeName(currentFontSize);
        }
    } else {
        console.error('Invalid font size:', size);
    }
};

window.testSlider = function() {
    const slider = document.getElementById('fontSizeSlider');
    if (slider) {
        console.log('Slider found:', slider);
        console.log('Slider value:', slider.value);
        console.log('Slider listeners:', getEventListeners ? getEventListeners(slider) : 'Cannot check listeners');
        
        // Симулируем изменение ползунка
        slider.value = '0'; // tiny
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        
        setTimeout(() => {
            slider.value = '4'; // huge
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        }, 1000);
    } else {
        console.error('Slider not found!');
    }
};

// Notion Integration Functions
window.openNotionIntegrationModal = function() {
    console.log('=== Opening Notion Integration modal ===');
    
    const modal = document.getElementById('notionIntegrationModal');
    if (modal) {
        // Загружаем сохраненные настройки
        const savedSettings = JSON.parse(localStorage.getItem('notion-settings') || '{}');
        
        // Загружаем API ключ
        const apiKeyInput = document.getElementById('notionApiKey');
        if (apiKeyInput && savedSettings.apiKey) {
            apiKeyInput.value = savedSettings.apiKey;
        }
        
        // Загружаем состояние тумблера
        const notionToggle = document.getElementById('notionToggle');
        if (notionToggle) {
            notionToggle.checked = savedSettings.enabled || false;
        }
        
        // Обновляем видимость секций
        if (typeof updateApiSectionVisibility === 'function') {
            updateApiSectionVisibility();
        }
        
        // Показываем модальное окно
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
            console.log('Notion integration modal opened');
            
            // Если есть API ключ, автоматически тестируем подключение и загружаем страницы
            if (savedSettings.apiKey && savedSettings.enabled) {
                testNotionConnectionAndLoadPages();
            }
        }, 10);
    } else {
        console.error('Notion integration modal not found!');
    }
};

window.closeNotionIntegrationModal = function() {
    console.log('=== Closing Notion Integration modal ===');
    const modal = document.getElementById('notionIntegrationModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
        console.log('Notion integration modal closed');
    }
};

// Функция для автоматического тестирования подключения и загрузки страниц
window.testNotionConnectionAndLoadPages = async function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    
    if (!apiKeyInput || !apiKeyInput.value.trim()) {
        return;
    }
    
    try {
        const response = await fetch('/api/notion/test/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                api_key: apiKeyInput.value.trim()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Notion connection successful, loading pages...');
            
            // После успешного подключения загружаем страницы
            await loadNotionPages();
            
        } else {
            console.log('Notion connection failed:', result.error);
        }
        
    } catch (error) {
        console.error('Notion connection test failed:', error);
    }
};

window.toggleApiKeyVisibility = function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    const toggleIcon = document.getElementById('apiKeyToggleIcon');
    
    if (apiKeyInput && toggleIcon) {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            apiKeyInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }
};

window.toggleInstructions = function() {
    const content = document.getElementById('instructionsContent');
    const chevron = document.getElementById('instructionsChevron');
    const header = document.querySelector('.instructions-header');
    
    if (content && chevron && header) {
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            header.classList.add('expanded');
        } else {
            content.style.display = 'none';
            header.classList.remove('expanded');
        }
    }
};

window.testNotionConnection = async function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    
    if (!apiKeyInput || !apiKeyInput.value.trim()) {
        alert('Пожалуйста, введите API ключ');
        return;
    }
    
    try {
        const response = await fetch('/api/notion/test/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                api_key: apiKeyInput.value.trim()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (window.chatApp) {
                window.chatApp.showNotification(`Подключение к Notion успешно! Пользователь: ${result.user || 'Неизвестно'}`, 'success');
            } else {
                alert(`Подключение к Notion успешно! Пользователь: ${result.user || 'Неизвестно'}`);
            }
            
            // После успешного подключения загружаем страницы
            await loadNotionPages();
            
        } else {
            const errorMessage = result.error || result.message || 'Неизвестная ошибка';
            
            if (window.chatApp) {
                // Для длинных сообщений об ошибках показываем в alert для лучшей читаемости
                if (errorMessage.length > 100) {
                    alert(`Ошибка подключения к Notion:\n\n${errorMessage}`);
                } else {
                    window.chatApp.showNotification(`Ошибка подключения: ${errorMessage}`, 'error');
                }
            } else {
                alert(`Ошибка подключения к Notion:\n\n${errorMessage}`);
            }
        }
        
        console.log('Notion connection test result:', result);
    } catch (error) {
        console.error('Notion connection test failed:', error);
        
        if (window.chatApp) {
            window.chatApp.showNotification('Ошибка подключения к Notion', 'error');
        } else {
            alert('Ошибка подключения к Notion');
        }
    }
};

window.saveNotionSettings = async function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    const notionToggle = document.getElementById('notionToggle');
    
    if (!apiKeyInput || !notionToggle) {
        console.error('Элементы настроек Notion не найдены');
        return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    const isEnabled = notionToggle.checked;
    
    // Получаем выбранную страницу
    const selectedPageCard = document.querySelector('.page-card.selected');
    let selectedPageId = null;
    let selectedPageTitle = null;
    
    if (selectedPageCard) {
        selectedPageId = selectedPageCard.dataset.pageId;
        selectedPageTitle = selectedPageCard.querySelector('.page-title')?.textContent || '';
    }
    
    if (!apiKey && isEnabled) {
        if (window.chatApp) {
            window.chatApp.showNotification('Введите API ключ для включения интеграции', 'error');
        } else {
            alert('Введите API ключ для включения интеграции');
        }
        return;
    }
    
    if (isEnabled && !selectedPageId) {
        if (window.chatApp) {
            window.chatApp.showNotification('Выберите страницу Notion для сохранения', 'error');
        } else {
            alert('Выберите страницу Notion для сохранения');
        }
        return;
    }
    
    try {
        // Сохраняем настройки в localStorage
        const notionSettings = {
            enabled: isEnabled,
            apiKey: apiKey,
            selectedPageId: selectedPageId,
            selectedPageTitle: selectedPageTitle
        };
        
        localStorage.setItem('notion-settings', JSON.stringify(notionSettings));
        
        // Также сохраняем на сервере
        const response = await fetch('/api/notion/settings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                api_key: apiKey,
                is_enabled: isEnabled,
                selected_page_id: selectedPageId,
                selected_page_title: selectedPageTitle
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (window.chatApp) {
                window.chatApp.showNotification('Настройки Notion сохранены', 'success');
            }
            
            console.log('Notion settings saved successfully');
        } else {
            if (window.chatApp) {
                window.chatApp.showNotification(`Ошибка сохранения: ${result.error}`, 'error');
            } else {
                alert(`Ошибка сохранения: ${result.error}`);
            }
        }
    } catch (error) {
        console.error('Error saving Notion settings:', error);
        
        if (window.chatApp) {
            window.chatApp.showNotification('Ошибка сохранения настроек Notion', 'error');
        } else {
            alert('Ошибка сохранения настроек Notion');
        }
    }
    
    closeNotionIntegrationModal();
};

// Функция для загрузки списка страниц Notion
window.loadNotionPages = async function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    const pageSelect = document.getElementById('notionPageSelect');
    const pageSection = document.getElementById('notionPageSection');
    
    if (!apiKeyInput || !pageSelect || !pageSection) {
        console.error('Elements for page loading not found');
        return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        console.log('No API key provided, skipping page loading');
        return;
    }
    
    // Показываем секцию выбора страниц
    pageSection.style.display = 'block';
    
    // Показываем индикатор загрузки
    pageSelect.innerHTML = '<option value="">Загрузка страниц...</option>';
    pageSelect.disabled = true;
    
    try {
        const response = await fetch('/api/notion/pages/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                api_key: apiKey
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.pages) {
            // Очищаем селект
            pageSelect.innerHTML = '<option value="">Выберите страницу...</option>';
            
            // Добавляем страницы
            result.pages.forEach(page => {
                const option = document.createElement('option');
                option.value = page.id;
                option.textContent = page.title;
                option.title = `Последнее изменение: ${new Date(page.last_edited).toLocaleString()}`;
                pageSelect.appendChild(option);
            });
            
            // Восстанавливаем сохраненный выбор
            const savedPageId = localStorage.getItem('notion-page-id');
            if (savedPageId) {
                pageSelect.value = savedPageId;
                updatePageInfo();
            }
            
            pageSelect.disabled = false;
            
            console.log(`Loaded ${result.pages.length} Notion pages`);
            
        } else {
            pageSelect.innerHTML = '<option value="">Ошибка загрузки страниц</option>';
            
            if (window.chatApp) {
                window.chatApp.showNotification(`Ошибка загрузки страниц: ${result.error || 'Неизвестная ошибка'}`, 'error');
            }
            
            console.error('Error loading pages:', result.error);
        }
        
    } catch (error) {
        console.error('Error loading Notion pages:', error);
        
        pageSelect.innerHTML = '<option value="">Ошибка подключения</option>';
        
        if (window.chatApp) {
            window.chatApp.showNotification('Ошибка загрузки страниц Notion', 'error');
        }
    }
};

// Функция для обновления списка страниц
window.refreshNotionPages = async function() {
    const refreshBtn = document.querySelector('.btn-refresh');
    
    if (refreshBtn) {
        const originalIcon = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;
    }
    
    await loadNotionPages();
    
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.disabled = false;
    }
};

// Функция для обновления информации о выбранной странице
window.updatePageInfo = function() {
    const pageSelect = document.getElementById('notionPageSelect');
    const pageInfo = document.getElementById('notionPageInfo');
    const selectedPageTitle = document.getElementById('selectedPageTitle');
    
    if (!pageSelect || !pageInfo || !selectedPageTitle) {
        return;
    }
    
    if (pageSelect.value && pageSelect.selectedOptions[0]) {
        const selectedTitle = pageSelect.selectedOptions[0].textContent;
        selectedPageTitle.textContent = selectedTitle;
        pageInfo.style.display = 'flex';
        
        // Сохраняем выбор в localStorage
        localStorage.setItem('notion-page-id', pageSelect.value);
        localStorage.setItem('notion-page-title', selectedTitle);
    } else {
        pageInfo.style.display = 'none';
        localStorage.removeItem('notion-page-id');
        localStorage.removeItem('notion-page-title');
    }
};

// Функция для управления тумблером Notion интеграции
window.toggleNotionIntegration = function(toggleElement) {
    const isEnabled = toggleElement.checked;
    
    console.log('Notion integration toggled:', isEnabled);
    
    // Сохраняем состояние тумблера
    localStorage.setItem('notion-integration-enabled', isEnabled);
    
    // Обновляем видимость секции API ключа
    updateApiSectionVisibility();
    
    // Обновляем кнопки сохранения в сообщениях
    updateNotionButtons();
    
    if (isEnabled) {
        // Если интеграция включена, проверяем наличие API ключа
        const savedApiKey = localStorage.getItem('notion-api-key');
        
        if (!savedApiKey) {
            if (window.chatApp) {
                window.chatApp.showNotification('Настройте API ключ Notion для работы интеграции', 'info');
            }
        } else {
            if (window.chatApp) {
                window.chatApp.showNotification('Интеграция с Notion включена', 'success');
            }
        }
    } else {
        if (window.chatApp) {
            window.chatApp.showNotification('Интеграция с Notion отключена', 'info');
        }
    }
};

// Функция для обновления видимости секций Notion
window.updateApiSectionVisibility = function() {
    const notionToggle = document.getElementById('notionToggle');
    const apiSection = document.getElementById('notionApiSection');
    const pageSection = document.getElementById('notionPageSection');
    const actionsSection = document.getElementById('notionActionsSection');
    
    if (notionToggle) {
        const isEnabled = notionToggle.checked;
        
        if (apiSection) {
            if (isEnabled) {
                apiSection.style.display = 'block';
                apiSection.style.opacity = '1';
            } else {
                apiSection.style.display = 'none';
                apiSection.style.opacity = '0.5';
            }
        }
        
        if (actionsSection) {
            if (isEnabled) {
                actionsSection.style.display = 'block';
            } else {
                actionsSection.style.display = 'none';
            }
        }
        
        // Автоматически загружаем страницы если есть API ключ и интеграция включена
        if (isEnabled) {
            const hasApiKey = localStorage.getItem('notion-api-key');
            if (hasApiKey) {
                setTimeout(() => {
                    testNotionConnectionAndLoadPages();
                }, 300);
            }
        } else if (pageSection) {
            pageSection.style.display = 'none';
        }
    }
};

// Функция для проверки состояния интеграции с Notion
window.isNotionIntegrationEnabled = function() {
    const isToggleEnabled = localStorage.getItem('notion-integration-enabled') === 'true';
    const hasApiKey = !!localStorage.getItem('notion-api-key');
    
    return isToggleEnabled && hasApiKey;
};

// Функция для загрузки состояния тумблера при инициализации
window.loadNotionIntegrationState = function() {
    const notionToggle = document.getElementById('notionToggle');
    if (notionToggle) {
        const isEnabled = localStorage.getItem('notion-integration-enabled') === 'true';
        notionToggle.checked = isEnabled;
        
        // Обновляем видимость секции API ключа
        if (typeof updateApiSectionVisibility === 'function') {
            updateApiSectionVisibility();
        }
        
        console.log('Notion integration state loaded:', isEnabled);
    }
};

// Функция для обновления кнопок Notion в сообщениях
window.updateNotionButtons = function() {
    const isEnabled = localStorage.getItem('notion-integration-enabled') === 'true';
    const hasApiKey = !!localStorage.getItem('notion-api-key');
    
    // Находим все сообщения ИИ и обновляем кнопки
    const aiMessages = document.querySelectorAll('.message.assistant');
    aiMessages.forEach(messageElement => {
        let notionBtn = messageElement.querySelector('.notion-save-btn');
        
        if (isEnabled && hasApiKey) {
            if (!notionBtn) {
                // Создаем кнопку если её нет
                const messageActions = messageElement.querySelector('.message-actions');
                if (messageActions) {
                    notionBtn = document.createElement('button');
                    notionBtn.className = 'message-action-btn notion-save-btn';
                    notionBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill="currentColor" d="M27 4.5h-5a1.5 1.5 0 0 0 0 3h1v12.66L14.814 5.278A1.5 1.5 0 0 0 13.5 4.5H5a1.5 1.5 0 0 0 0 3h1v17H5a1.5 1.5 0 1 0 0 3h5a1.5 1.5 0 1 0 0-3H9V11.84l8.186 14.883a1.5 1.5 0 0 0 1.314.777h6A1.5 1.5 0 0 0 26 26V7.5h1a1.5 1.5 0 0 0 0-3m-16.962 3h2.575l9.35 17h-2.576z"/>
                        </svg>
                    `;
                    notionBtn.title = 'Сохранить в Notion';
                    notionBtn.setAttribute('data-message-id', messageElement.getAttribute('data-message-id'));
                    
                    notionBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const messageId = notionBtn.getAttribute('data-message-id');
                        const messageElement = notionBtn.closest('.message');
                        const messageContent = messageElement ? messageElement.querySelector('.message-content').textContent.trim() : '';
                        if (messageId) {
                            window.saveMessageToNotion(messageId, messageContent, notionBtn);
                        }
                    });
                    
                    messageActions.appendChild(notionBtn);
                }
            }
            notionBtn.style.display = '';
        } else {
            // Скрываем кнопку если интеграция отключена
            if (notionBtn) {
                notionBtn.style.display = 'none';
            }
        }
    });
};

// Функция для сохранения сообщения в Notion


// Функции для работы с выбором страниц Notion
window.loadNotionPages = async function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    const pagesList = document.getElementById('notionPagesList');
    const refreshBtn = document.getElementById('refreshPagesBtn');
    
    if (!apiKeyInput || !apiKeyInput.value.trim()) {
        if (window.chatApp) {
            window.chatApp.showNotification('Введите API ключ для загрузки страниц', 'error');
        }
        return;
    }
    
    if (!pagesList) {
        console.error('Pages list element not found');
        return;
    }
    
    // Показываем загрузку
    pagesList.innerHTML = `
        <div class="loading-pages">
            <i class="fas fa-spinner fa-spin"></i>
            <span data-translate="loading_pages">Загрузка страниц...</span>
        </div>
    `;
    
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.querySelector('i').classList.add('fa-spin');
    }
    
    try {
        const response = await fetch('/api/notion/pages/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                api_key: apiKeyInput.value.trim()
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.pages) {
            if (result.pages.length === 0) {
                pagesList.innerHTML = `
                    <div class="no-pages">
                        <i class="fas fa-file-slash"></i>
                        <span>Страницы не найдены. Убедитесь, что интеграция добавлена к страницам в Notion.</span>
                    </div>
                `;
            } else {
                let pagesHtml = '<div class="pages-grid">';
                
                result.pages.forEach(page => {
                    const pageDate = page.last_edited ? new Date(page.last_edited).toLocaleDateString('ru-RU') : '';
                    
                    pagesHtml += `
                        <div class="page-card" data-page-id="${page.id}" onclick="selectNotionPage('${page.id}', '${page.title.replace(/'/g, "\\'")}')">
                            <div class="page-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="page-info">
                                <div class="page-title">${page.title}</div>
                                ${pageDate ? `<div class="page-date">Изменено: ${pageDate}</div>` : ''}
                            </div>
                            <div class="page-select-btn">
                                <i class="fas fa-check"></i>
                            </div>
                        </div>
                    `;
                });
                
                pagesHtml += '</div>';
                pagesList.innerHTML = pagesHtml;
                
                // Показываем секцию выбора страниц
                const pageSection = document.getElementById('notionPageSection');
                if (pageSection) {
                    pageSection.style.display = 'block';
                }
            }
        } else {
            pagesList.innerHTML = `
                <div class="error-pages">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Ошибка загрузки страниц: ${result.error || 'Неизвестная ошибка'}</span>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading Notion pages:', error);
        pagesList.innerHTML = `
            <div class="error-pages">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Ошибка подключения к Notion</span>
            </div>
        `;
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.querySelector('i').classList.remove('fa-spin');
        }
    }
};

window.selectNotionPage = async function(pageId, pageTitle) {
    console.log('Selecting Notion page:', pageId, pageTitle);
    
    try {
        // Сначала обновляем UI
        const pageCards = document.querySelectorAll('.page-card');
        pageCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-page-id="${pageId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Показываем информацию о выбранной странице
        const selectedPageInfo = document.getElementById('selectedPageInfo');
        const selectedPageTitle = document.getElementById('selectedPageTitle');
        
        if (selectedPageInfo && selectedPageTitle) {
            selectedPageTitle.textContent = pageTitle;
            selectedPageInfo.style.display = 'block';
        }
        
        // Показываем кнопку сохранения
        const actionsSection = document.getElementById('notionActionsSection');
        if (actionsSection) {
            actionsSection.style.display = 'block';
        }
        
        // Сохраняем выбор в localStorage
        const currentSettings = JSON.parse(localStorage.getItem('notion-settings') || '{}');
        currentSettings.selectedPageId = pageId;
        currentSettings.selectedPageTitle = pageTitle;
        localStorage.setItem('notion-settings', JSON.stringify(currentSettings));
        
        // Также отправляем на сервер
        const response = await fetch('/api/notion/pages/select/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                page_id: pageId,
                page_title: pageTitle
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Page selection saved on server');
            if (window.chatApp) {
                window.chatApp.showNotification(`Страница "${pageTitle}" выбрана`, 'success');
            }
        } else {
            console.warn('Failed to save page selection on server:', result.error);
        }
        
    } catch (error) {
        console.error('Error selecting Notion page:', error);
        if (window.chatApp) {
            window.chatApp.showNotification('Ошибка выбора страницы', 'error');
        }
    }
};

// Функция обработки ввода API ключа
window.handleNotionApiKeyInput = function() {
    const apiKeyInput = document.getElementById('notionApiKey');
    const notionToggle = document.getElementById('notionToggle');
    
    if (!apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    
    // Сохраняем API ключ в localStorage
    if (apiKey) {
        localStorage.setItem('notion-api-key', apiKey);
        
        // Если интеграция включена, автоматически тестируем подключение
        if (notionToggle && notionToggle.checked) {
            // Задержка для уменьшения количества запросов
            clearTimeout(window.notionApiKeyTimeout);
            window.notionApiKeyTimeout = setTimeout(() => {
                testNotionConnectionAndLoadPages();
            }, 1000);
        }
    } else {
        localStorage.removeItem('notion-api-key');
        
        // Скрываем секцию страниц если нет API ключа
        const pageSection = document.getElementById('notionPageSection');
        if (pageSection) {
            pageSection.style.display = 'none';
        }
    }
};

// Метод для сохранения сообщения в Notion
window.saveMessageToNotion = async function(messageId, content, buttonElement) {
    console.log('Saving message to Notion:', messageId, content, buttonElement);
    
    // Проверяем, что buttonElement передан
    if (!buttonElement) {
        console.error('Button element not provided to saveMessageToNotion');
        return;
    }
    
    // Проверяем основные настройки Notion
    const isEnabled = localStorage.getItem('notion-integration-enabled') === 'true';
    const hasApiKey = !!localStorage.getItem('notion-api-key');
    
    if (!isEnabled || !hasApiKey) {
        if (window.chatApp) {
            window.chatApp.showNotification('Настройте интеграцию с Notion в настройках', 'error');
        } else {
            alert('Настройте интеграцию с Notion в настройках');
        }
        return;
    }

    // Показываем состояние загрузки
    const originalContent = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;
    buttonElement.classList.add('loading');

    try {
        const response = await fetch('/api/notion/save-message/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.csrfToken
            },
            body: JSON.stringify({
                content: content,
                message_id: messageId
            })
        });

        const result = await response.json();

        if (result.success) {
            if (window.chatApp) {
                window.chatApp.showNotification('Сообщение сохранено в Notion', 'success');
            }
            
            // Меняем иконку на успешную на короткое время
            buttonElement.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                buttonElement.innerHTML = originalContent;
            }, 2000);
        } else {
            if (window.chatApp) {
                window.chatApp.showNotification(result.error || 'Ошибка сохранения в Notion', 'error');
            }
            buttonElement.innerHTML = originalContent;
        }
    } catch (error) {
        console.error('Ошибка сохранения в Notion:', error);
        if (window.chatApp) {
            window.chatApp.showNotification('Ошибка подключения к Notion', 'error');
        }
        buttonElement.innerHTML = originalContent;
    } finally {
        buttonElement.disabled = false;
        buttonElement.classList.remove('loading');
    }
};

// ТЕСТОВАЯ ФУНКЦИЯ - Добавить тестовое сообщение с кнопкой Notion
window.addTestNotionMessage = function() {
    console.log('Adding test message with Notion button');
    
    const testMessage = {
        id: 'test-' + Date.now(),
        type: 'assistant',
        content: 'Это тестовое сообщение для проверки кнопки Notion. Вы должны видеть кнопку с логотипом Notion рядом с кнопками копирования и избранного.',
        timestamp: new Date().toISOString()
    };
    
    if (window.chatApp && window.chatApp.renderMessage) {
        window.chatApp.renderMessage(testMessage);
    } else {
        console.error('ChatApp or renderMessage not found');
    }
};

// Добавляем тестовую функцию в консоль для отладки
console.log('Notion integration loaded. Use addTestNotionMessage() to test button');

// Глобальные функции для работы с изображениями
function openImageModal(imageSrc) {
    if (window.chatApp && window.chatApp.openImageModal) {
        window.chatApp.openImageModal(imageSrc);
    }
}

function closeImageModal() {
    if (window.chatApp && window.chatApp.closeImageModal) {
        window.chatApp.closeImageModal();
    }
}
