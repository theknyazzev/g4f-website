// Система локализации
class LocalizationManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('selectedLanguage') || 'ru';
        this.translations = {
            ru: {
                // Основной интерфейс
                chats: 'Чаты',
                new_chat: 'Новый чат',
                user: 'Пользователь',
                settings: 'Настройки',
                auto: 'Авто',
                clear_chat: 'Очистить чат',
                export_chat: 'Экспорт чата',
                
                // Приветственный экран
                welcome_title: 'Добро пожаловать в Premium ChatGPT',
                welcome_subtitle: 'Начните новую беседу, задав любой вопрос',
                explain_quantum: 'Объясни квантовую физику',
                programming_plan: 'План изучения программирования',
                space_story: 'История о космосе',
                healthy_lifestyle: 'Здоровый образ жизни',
                
                // Ввод сообщений
                write_message: 'Напишите сообщение...',
                generation_paused: 'Генерация приостановлена',
                continue_generation: 'Продолжить генерацию',
                image_actions: 'Действия с изображениями',
                upload_image: 'Загрузить изображение',
                generate_image: 'Генерировать изображение',
                
                // Настройки
                profile: 'Профиль',
                not_specified: 'Не указан',
                google_account: 'Google Аккаунт',
                not_connected: 'Не подключено',
                sign_in: 'Войти',
                sign_out: 'Выйти',
                data_management: 'Управление данными',
                export_clear_chats: 'Экспорт и очистка чатов',
                application: 'Приложение',
                font_size: 'Размер шрифта',
                default: 'По умолчанию',
                adjust_font_size: 'Настроить размер шрифта',
                language: 'Язык',
                about: 'О программе',
                version: 'Версия',
                service_agreement: 'Соглашение об обслуживании',
                
                // Языки
                choose_language: 'Выбор языка',
                russian: 'Русский',
                english: 'English',
                english_desc: 'English',
                belarusian: 'Беларуская',
                belarusian_desc: 'Беларуская мова',
                ukrainian: 'Українська',
                ukrainian_desc: 'Українська мова',
                
                // Модальные окна
                usage_statistics: 'Статистика использования',
                close: 'Закрыть',
                cancel: 'Отмена',
                save: 'Сохранить',
                delete: 'Удалить',
                rename: 'Переименовать',
                reset: 'Сбросить',
                
                // Статистика активности
                general_activity: 'Общая активность',
                chats_count: 'чатов',
                messages_count: 'сообщений',
                characters_count: 'символов',
                activity_level: 'Уровень активности',
                beginner: 'Новичок',
                active: 'Активный',
                expert: 'Эксперт',
                achievements: 'Достижения',
                
                // Управление данными
                improve_model_for_all: 'Улучшим модель для всех',
                training_description: 'Разрешить использовать ваш контент для обучения наших моделей и улучшения наших сервисов. Мы принимаем меры для защиты вашей конфиденциальности.',
                delete_all_chats: 'Удалить все чаты',
                delete_account: 'Удалить аккаунт',
                
                // Правовые документы
                terms_of_service: 'Условия использования',
                terms_description: 'Правила и условия использования сервиса',
                privacy_policy: 'Политика конфиденциальности',
                privacy_description: 'Как мы обрабатываем ваши данные',
                
                // Настройки шрифта
                font_preview_text: 'Предпросмотр размера шрифта',
                font_slider_instruction: 'Вы можете изменить размер шрифта, перетащив ползунок ниже',
                
                // Типинг индикатор
                chatgpt_typing: 'ChatGPT печатает...',
                
                // Контекстное меню
                rename_chat: 'Переименовать чат',
                delete_chat: 'Удалить чат',
                
                // Модальные окна
                rename: 'Переименовать',
                enter_chat_name: 'Введите название чата',
                chat_name: 'Название чата',
                
                // Время
                now: 'сейчас',
                minute_ago: 'минуту назад',
                minutes_ago: 'минут назад',
                hour_ago: 'час назад',
                hours_ago: 'часов назад',
                day_ago: 'день назад',
                days_ago: 'дней назад',
                
                // Размеры шрифта
                very_small: 'Очень маленький',
                small: 'Маленький',
                large: 'Большой',
                very_large: 'Очень большой',
                
                // Промпты по умолчанию
                default_prompts: {
                    quantum: 'Объясни мне квантовую физику простыми словами',
                    programming: 'Помоги написать план для изучения программирования',
                    space: 'Расскажи интересную историю о космосе',
                    health: 'Дай советы по здоровому образу жизни'
                },
                
                // Достижения
                achievements: {
                    // Названия достижений
                    first_chat: 'Первый шаг',
                    chat_master: 'Мастер чатов',
                    message_warrior: 'Воин сообщений',
                    word_master: 'Мастер слов',
                    
                    // Описания достижений
                    descriptions: {
                        first_chat: 'Создать первый чат',
                        chat_master: 'Создать 10 чатов',
                        message_warrior: 'Отправить 100 сообщений',
                        word_master: 'Написать 10000 символов'
                    },
                    
                    // Интерфейс модального окна достижений
                    modal: {
                        title: 'Достижения',
                        unlocked: 'Достижение разблокировано!',
                        locked: 'Достижение заблокировано',
                        description_label: 'Описание:',
                        progress_label: 'Прогресс:',
                        close: 'Закрыть',
                        progress_completed: 'выполнено'
                    }
                }
            },
            
            en: {
                // Main interface
                chats: 'Chats',
                new_chat: 'New Chat',
                user: 'User',
                settings: 'Settings',
                auto: 'Auto',
                clear_chat: 'Clear Chat',
                export_chat: 'Export Chat',
                
                // Welcome screen
                welcome_title: 'Welcome to Premium ChatGPT',
                welcome_subtitle: 'Start a new conversation by asking any question',
                explain_quantum: 'Explain quantum physics',
                programming_plan: 'Programming learning plan',
                space_story: 'Space story',
                healthy_lifestyle: 'Healthy lifestyle',
                
                // Message input
                write_message: 'Write a message...',
                generation_paused: 'Generation paused',
                continue_generation: 'Continue generation',
                image_actions: 'Image actions',
                upload_image: 'Upload image',
                generate_image: 'Generate image',
                
                // Settings
                profile: 'Profile',
                not_specified: 'Not specified',
                google_account: 'Google Account',
                not_connected: 'Not connected',
                sign_in: 'Sign In',
                sign_out: 'Sign Out',
                data_management: 'Data Management',
                export_clear_chats: 'Export and clear chats',
                application: 'Application',
                font_size: 'Font Size',
                default: 'Default',
                adjust_font_size: 'Adjust font size',
                language: 'Language',
                about: 'About',
                version: 'Version',
                service_agreement: 'Service Agreement',
                
                // Languages
                choose_language: 'Choose Language',
                russian: 'Русский',
                english: 'English',
                english_desc: 'English',
                belarusian: 'Беларуская',
                belarusian_desc: 'Беларуская мова',
                ukrainian: 'Українська',
                ukrainian_desc: 'Українська мова',
                
                // Modal windows
                usage_statistics: 'Usage Statistics',
                close: 'Close',
                cancel: 'Cancel',
                save: 'Save',
                delete: 'Delete',
                rename: 'Rename',
                reset: 'Reset',
                
                // Activity statistics
                general_activity: 'General Activity',
                chats_count: 'chats',
                messages_count: 'messages',
                characters_count: 'characters',
                activity_level: 'Activity Level',
                beginner: 'Beginner',
                active: 'Active',
                expert: 'Expert',
                achievements: 'Achievements',
                
                // Data management
                improve_model_for_all: 'Improve model for everyone',
                training_description: 'Allow using your content to train our models and improve our services. We take measures to protect your privacy.',
                delete_all_chats: 'Delete all chats',
                delete_account: 'Delete account',
                
                // Legal documents
                terms_of_service: 'Terms of Service',
                terms_description: 'Rules and conditions for using the service',
                privacy_policy: 'Privacy Policy',
                privacy_description: 'How we process your data',
                
                // Font settings
                font_preview_text: 'Font size preview',
                font_slider_instruction: 'You can change the font size by dragging the slider below',
                
                // Typing indicator
                chatgpt_typing: 'ChatGPT is typing...',
                
                // Context menu
                rename_chat: 'Rename Chat',
                delete_chat: 'Delete Chat',
                
                // Modal windows
                rename: 'Rename',
                enter_chat_name: 'Enter chat name',
                chat_name: 'Chat name',
                
                // Time
                now: 'now',
                minute_ago: 'a minute ago',
                minutes_ago: 'minutes ago',
                hour_ago: 'an hour ago',
                hours_ago: 'hours ago',
                day_ago: 'a day ago',
                days_ago: 'days ago',
                
                // Font sizes
                very_small: 'Very Small',
                small: 'Small',
                large: 'Large',
                very_large: 'Very Large',
                
                // Default prompts
                default_prompts: {
                    quantum: 'Explain quantum physics to me in simple terms',
                    programming: 'Help me write a plan for learning programming',
                    space: 'Tell me an interesting story about space',
                    health: 'Give me advice on healthy living'
                },
                
                // Achievements
                achievements: {
                    // Achievement names
                    first_chat: 'First Step',
                    chat_master: 'Chat Master',
                    message_warrior: 'Message Warrior',
                    word_master: 'Word Master',
                    
                    // Achievement descriptions
                    descriptions: {
                        first_chat: 'Create first chat',
                        chat_master: 'Create 10 chats',
                        message_warrior: 'Send 100 messages',
                        word_master: 'Write 10000 characters'
                    },
                    
                    // Achievement modal interface
                    modal: {
                        title: 'Achievements',
                        unlocked: 'Achievement unlocked!',
                        locked: 'Achievement locked',
                        description_label: 'Description:',
                        progress_label: 'Progress:',
                        close: 'Close',
                        progress_completed: 'completed'
                    }
                }
            },
            
            be: {
                // Асноўны інтэрфейс
                chats: 'Чаты',
                new_chat: 'Новы чат',
                user: 'Карыстальнік',
                settings: 'Налады',
                auto: 'Аўта',
                clear_chat: 'Ачысціць чат',
                export_chat: 'Экспарт чата',
                
                // Прывітальны экран
                welcome_title: 'Сардэчна запрашаем у Premium ChatGPT',
                welcome_subtitle: 'Пачніте новую размову, задаўшы любое пытанне',
                explain_quantum: 'Растлумач квантавую фізіку',
                programming_plan: 'План вывучэння праграмавання',
                space_story: 'Гісторыя пра космас',
                healthy_lifestyle: 'Здаровы лад жыцця',
                
                // Увод паведамленняў
                write_message: 'Напішыце паведамленне...',
                generation_paused: 'Генерацыя прыпынена',
                continue_generation: 'Працягнуць генерацыю',
                image_actions: 'Дзеянні з выявамі',
                upload_image: 'Загрузіць выяву',
                generate_image: 'Згенераваць выяву',
                
                // Налады
                profile: 'Профіль',
                not_specified: 'Не паказана',
                google_account: 'Google акаўнт',
                not_connected: 'Не падключана',
                sign_in: 'Увайсці',
                sign_out: 'Выйсці',
                data_management: 'Кіраванне данымі',
                export_clear_chats: 'Экспарт і ачыстка чатаў',
                application: 'Прыкладанне',
                font_size: 'Памер шрыфта',
                default: 'Па змаўчанні',
                adjust_font_size: 'Наладзіць памер шрыфта',
                language: 'Мова',
                about: 'Пра праграму',
                version: 'Версія',
                service_agreement: 'Пагадненне аб абслугоўванні',
                
                // Мовы
                choose_language: 'Выбар мовы',
                russian: 'Русский',
                english: 'English',
                english_desc: 'English',
                belarusian: 'Беларуская',
                belarusian_desc: 'Беларуская мова',
                ukrainian: 'Українська',
                ukrainian_desc: 'Українська мова',
                
                // Мадальныя вокны
                usage_statistics: 'Статыстыка выкарыстання',
                close: 'Закрыць',
                cancel: 'Адмена',
                save: 'Захаваць',
                delete: 'Выдаліць',
                rename: 'Перайменаваць',
                reset: 'Скінуць',
                
                // Статыстыка актыўнасці
                general_activity: 'Агульная актыўнасць',
                chats_count: 'чатаў',
                messages_count: 'паведамленняў',
                characters_count: 'сімвалаў',
                activity_level: 'Узровень актыўнасці',
                beginner: 'Пачаткоўца',
                active: 'Актыўны',
                expert: 'Эксперт',
                achievements: 'Дасягненні',
                
                // Кіраванне данымі
                improve_model_for_all: 'Паляпшым мадэль для ўсіх',
                training_description: 'Дазволіць выкарыстоўваць ваш кантэнт для навучання нашых мадэляў і паляпшэння нашых сэрвісаў. Мы прымаем меры па абароне вашай прыватнасці.',
                delete_all_chats: 'Выдаліць усе чаты',
                delete_account: 'Выдаліць акаўнт',
                
                // Прававыя дакументы
                terms_of_service: 'Умовы выкарыстання',
                terms_description: 'Правілы і ўмовы выкарыстання сэрвісу',
                privacy_policy: 'Палітыка канфідэнцыяльнасці',
                privacy_description: 'Як мы апрацоўваем вашы даныя',
                
                // Налады шрыфта
                font_preview_text: 'Папярэдні прагляд памеру шрыфта',
                font_slider_instruction: 'Вы можаце змяніць памер шрыфта, перацягнуўшы паўзунок ніжэй',
                
                // Індыкатар набору
                chatgpt_typing: 'ChatGPT друкуе...',
                
                // Кантэкстнае меню
                rename_chat: 'Перайменаваць чат',
                delete_chat: 'Выдаліць чат',
                
                // Мадальныя вокны
                rename: 'Перайменаваць',
                enter_chat_name: 'Увядзіце назву чата',
                chat_name: 'Назва чата',
                
                // Час
                now: 'зараз',
                minute_ago: 'хвіліну таму',
                minutes_ago: 'хвілін таму',
                hour_ago: 'гадзіну таму',
                hours_ago: 'гадзін таму',
                day_ago: 'дзень таму',
                days_ago: 'дзён таму',
                
                // Памеры шрыфта
                very_small: 'Вельмі малы',
                small: 'Малы',
                large: 'Вялікі',
                very_large: 'Вельмі вялікі',
                
                // Прампты па змаўчанні
                default_prompts: {
                    quantum: 'Растлумач мне квантавую фізіку простымі словамі',
                    programming: 'Дапамажы напісаць план для вывучэння праграмавання',
                    space: 'Расскажы цікавую гісторыю пра космас',
                    health: 'Дай парады па здаровым ладзе жыцця'
                },
                
                // Дасягненні
                achievements: {
                    // Назвы дасягненняў
                    first_chat: 'Першы крок',
                    chat_master: 'Майстар чатаў',
                    message_warrior: 'Воін паведамленняў',
                    word_master: 'Майстар словаў',
                    
                    // Апісанні дасягненняў
                    descriptions: {
                        first_chat: 'Стварыць першы чат',
                        chat_master: 'Стварыць 10 чатаў',
                        message_warrior: 'Адправіць 100 паведамленняў',
                        word_master: 'Напісаць 10000 сімвалаў'
                    },
                    
                    // Інтэрфейс мадальнага вакна дасягненняў
                    modal: {
                        title: 'Дасягненні',
                        unlocked: 'Дасягненне разблакавана!',
                        locked: 'Дасягненне заблакавана',
                        description_label: 'Апісанне:',
                        progress_label: 'Прагрэс:',
                        close: 'Закрыць',
                        progress_completed: 'выканана'
                    }
                }
            },
            
            uk: {
                // Основний інтерфейс
                chats: 'Чати',
                new_chat: 'Новий чат',
                user: 'Користувач',
                settings: 'Налаштування',
                auto: 'Авто',
                clear_chat: 'Очистити чат',
                export_chat: 'Експорт чату',
                
                // Привітальний екран
                welcome_title: 'Ласкаво просимо до Premium ChatGPT',
                welcome_subtitle: 'Почніть нову розмову, поставивши будь-яке питання',
                explain_quantum: 'Поясни квантову фізику',
                programming_plan: 'План вивчення програмування',
                space_story: 'Історія про космос',
                healthy_lifestyle: 'Здоровий спосіб життя',
                
                // Введення повідомлень
                write_message: 'Напишіть повідомлення...',
                generation_paused: 'Генерацію призупинено',
                continue_generation: 'Продовжити генерацію',
                image_actions: 'Дії із зображеннями',
                upload_image: 'Завантажити зображення',
                generate_image: 'Згенерувати зображення',
                
                // Налаштування
                profile: 'Профіль',
                not_specified: 'Не вказано',
                google_account: 'Google акаунт',
                not_connected: 'Не підключено',
                sign_in: 'Увійти',
                sign_out: 'Вийти',
                data_management: 'Управління даними',
                export_clear_chats: 'Експорт та очищення чатів',
                application: 'Додаток',
                font_size: 'Розмір шрифту',
                default: 'За замовчуванням',
                adjust_font_size: 'Налаштувати розмір шрифту',
                language: 'Мова',
                about: 'Про програму',
                version: 'Версія',
                service_agreement: 'Угода про обслуговування',
                
                // Мови
                choose_language: 'Вибір мови',
                russian: 'Русский',
                english: 'English',
                english_desc: 'English',
                belarusian: 'Беларуская',
                belarusian_desc: 'Беларуская мова',
                ukrainian: 'Українська',
                ukrainian_desc: 'Українська мова',
                
                // Модальні вікна
                usage_statistics: 'Статистика використання',
                close: 'Закрити',
                cancel: 'Скасування',
                save: 'Зберегти',
                delete: 'Видалити',
                rename: 'Перейменувати',
                reset: 'Скинути',
                
                // Статистика активності
                general_activity: 'Загальна активність',
                chats_count: 'чатів',
                messages_count: 'повідомлень',
                characters_count: 'символів',
                activity_level: 'Рівень активності',
                beginner: 'Новачок',
                active: 'Активний',
                expert: 'Експерт',
                achievements: 'Досягнення',
                
                // Управління даними
                improve_model_for_all: 'Покращимо модель для всіх',
                training_description: 'Дозволити використовувати ваш контент для навчання наших моделей та покращення наших сервісів. Ми вживаємо заходів для захисту вашої приватності.',
                delete_all_chats: 'Видалити всі чати',
                delete_account: 'Видалити акаунт',
                
                // Правові документи
                terms_of_service: 'Умови використання',
                terms_description: 'Правила та умови використання сервісу',
                privacy_policy: 'Політика конфіденційності',
                privacy_description: 'Як ми обробляємо ваші дані',
                
                // Налаштування шрифту
                font_preview_text: 'Попередній перегляд розміру шрифту',
                font_slider_instruction: 'Ви можете змінити розмір шрифту, перетягнувши повзунок нижче',
                
                // Індикатор набору
                chatgpt_typing: 'ChatGPT друкує...',
                
                // Контекстне меню
                rename_chat: 'Перейменувати чат',
                delete_chat: 'Видалити чат',
                
                // Модальні вікна
                rename: 'Перейменувати',
                enter_chat_name: 'Введіть назву чату',
                chat_name: 'Назва чату',
                
                // Час
                now: 'зараз',
                minute_ago: 'хвилину тому',
                minutes_ago: 'хвилин тому',
                hour_ago: 'годину тому',
                hours_ago: 'годин тому',
                day_ago: 'день тому',
                days_ago: 'днів тому',
                
                // Розміри шрифту
                very_small: 'Дуже малий',
                small: 'Малий',
                large: 'Великий',
                very_large: 'Дуже великий',
                
                // Промпти за замовчуванням
                default_prompts: {
                    quantum: 'Поясни мені квантову фізику простими словами',
                    programming: 'Допоможи написати план для вивчення програмування',
                    space: 'Розкажи цікаву історію про космос',
                    health: 'Дай поради щодо здорового способу життя'
                },
                
                // Досягнення
                achievements: {
                    // Назви досягнень
                    first_chat: 'Перший крок',
                    chat_master: 'Майстер чатів',
                    message_warrior: 'Воїн повідомлень',
                    word_master: 'Майстер слів',
                    
                    // Описи досягнень
                    descriptions: {
                        first_chat: 'Створити перший чат',
                        chat_master: 'Створити 10 чатів',
                        message_warrior: 'Відправити 100 повідомлень',
                        word_master: 'Написати 10000 символів'
                    },
                    
                    // Інтерфейс модального вікна досягнень
                    modal: {
                        title: 'Досягнення',
                        unlocked: 'Досягнення розблоковано!',
                        locked: 'Досягнення заблоковано',
                        description_label: 'Опис:',
                        progress_label: 'Прогрес:',
                        close: 'Закрити',
                        progress_completed: 'виконано'
                    }
                }
            }
        };
    }

    // Получить текущий язык
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Установить язык
    setLanguage(languageCode) {
        if (this.translations[languageCode]) {
            this.currentLanguage = languageCode;
            localStorage.setItem('selectedLanguage', languageCode);
            this.translatePage();
            this.updateLanguageDisplay();
            return true;
        }
        return false;
    }

    // Получить перевод
    translate(key, fallback = key) {
        const translation = this.translations[this.currentLanguage];
        
        // Проверяем на вложенные ключи (например, "achievements.modal.title")
        if (key.includes('.')) {
            const keys = key.split('.');
            let value = translation;
            
            for (const k of keys) {
                if (value && value[k]) {
                    value = value[k];
                } else {
                    value = null;
                    break;
                }
            }
            
            if (value && typeof value === 'string') {
                return value;
            }
            
            // Пробуем русский как fallback для вложенных ключей
            if (this.currentLanguage !== 'ru' && this.translations.ru) {
                let fallbackValue = this.translations.ru;
                for (const k of keys) {
                    if (fallbackValue && fallbackValue[k]) {
                        fallbackValue = fallbackValue[k];
                    } else {
                        fallbackValue = null;
                        break;
                    }
                }
                if (fallbackValue && typeof fallbackValue === 'string') {
                    return fallbackValue;
                }
            }
            
            return fallback;
        }
        
        // Обычная проверка для простых ключей
        if (translation && translation[key]) {
            // Проверяем, что это строка, а не объект
            if (typeof translation[key] === 'string') {
                return translation[key];
            }
        }
        
        // Если перевод не найден, попробуем русский как fallback
        if (this.currentLanguage !== 'ru' && this.translations.ru[key]) {
            if (typeof this.translations.ru[key] === 'string') {
                return this.translations.ru[key];
            }
        }
        
        return fallback;
    }

    // Перевести всю страницу
    translatePage() {
        // Переводим элементы с data-translate
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            if (translation !== key) {
                element.textContent = translation;
            }
        });

        // Переводим placeholder'ы
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = this.translate(key);
            if (translation !== key) {
                element.placeholder = translation;
            }
        });

        // Переводим title атрибуты
        document.querySelectorAll('[data-translate-title]').forEach(element => {
            const key = element.getAttribute('data-translate-title');
            const translation = this.translate(key);
            if (translation !== key) {
                element.title = translation;
            }
        });

        // Обновляем промпты по умолчанию
        this.updateDefaultPrompts();
        
        // Обновляем достижения
        this.updateAchievements();
    }

    // Обновить промпты по умолчанию
    updateDefaultPrompts() {
        const prompts = this.translations[this.currentLanguage].default_prompts;
        
        document.querySelectorAll('.prompt-card').forEach((card, index) => {
            const keys = ['quantum', 'programming', 'space', 'health'];
            if (keys[index] && prompts[keys[index]]) {
                card.setAttribute('data-prompt', prompts[keys[index]]);
            }
        });
    }

    // Обновить достижения
    updateAchievements() {
        // Если в приложении есть метод обновления статистики, вызываем его
        if (window.chatApp && typeof window.chatApp.updateStatsModal === 'function') {
            window.chatApp.updateStatsModal();
        }
    }

    // Обновить отображение выбранного языка
    updateLanguageDisplay() {
        const languageNames = {
            'ru': this.translate('russian'),
            'en': this.translate('english'),
            'be': this.translate('belarusian'),
            'uk': this.translate('ukrainian')
        };

        const currentLanguageText = document.getElementById('currentLanguageText');
        if (currentLanguageText) {
            currentLanguageText.textContent = languageNames[this.currentLanguage] || this.translate('russian');
        }

        // Обновляем чекбоксы в модальном окне выбора языка
        document.querySelectorAll('.language-check').forEach(check => {
            check.style.display = 'none';
        });

        const activeCheck = document.getElementById(`lang-check-${this.currentLanguage}`);
        if (activeCheck) {
            activeCheck.style.display = 'block';
        }
    }

    // Инициализация локализации
    init() {
        this.translatePage();
        this.updateLanguageDisplay();
        this.setupLanguageModal();
    }

    // Настройка модального окна выбора языка
    setupLanguageModal() {
        const modal = document.getElementById('languageModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeLanguageModal();
                }
            });
        }
    }
}

// Создаем глобальный экземпляр менеджера локализации
window.localizationManager = new LocalizationManager();

// Функции для работы с модальным окном выбора языка
function openLanguageModal() {
    const modal = document.getElementById('languageModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    window.localizationManager.updateLanguageDisplay();
}

function closeLanguageModal() {
    const modal = document.getElementById('languageModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 200);
}

function selectLanguage(languageCode) {
    if (window.localizationManager.setLanguage(languageCode)) {
        // Язык успешно изменен
        closeLanguageModal();
        
        // Обновляем интерфейс
        if (window.chatApp) {
            window.chatApp.updateInterfaceLanguage();
        }
    }
}

// Экспортируем функции для глобального использования
window.openLanguageModal = openLanguageModal;
window.closeLanguageModal = closeLanguageModal;
window.selectLanguage = selectLanguage;
