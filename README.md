# g4f website

A sophisticated Django-powered chat application with AI integration, multilingual support, and advanced features for enhanced user experience.

## 🚀 Key Features

### 💬 Advanced Chat System
- **Multi-Model AI Support**: Integration with GPT-4, GPT-4o, Gemini, Qwen, DeepSeek models
- **Real-time Messaging**: WebSocket support for instant communication
- **Message History**: Persistent chat sessions with automatic saving
- **Chat Management**: Rename, delete, and organize conversations
- **Export Functionality**: Download chat history in various formats

### 🤖 AI Capabilities
- **Multiple AI Providers**: Automatic provider switching for reliability
- **Image Generation**: AI-powered image creation capabilities
- **Image Upload & Analysis**: Upload images for AI analysis
- **Model Selection**: Choose from various AI models based on your needs
- **Smart Responses**: Context-aware AI responses with memory

### 🌍 Internationalization
- **Multi-language Support**: Russian, English, Belarusian, Ukrainian
- **Dynamic Language Switching**: Change language without page reload
- **Localized Content**: Full interface translation including legal documents

### 🔐 Security & Authentication
- **Google OAuth 2.0**: Secure authentication with Google accounts
- **User Profiles**: Personalized user experience
- **Data Privacy**: Comprehensive privacy controls
- **Secure API**: Protected endpoints with CSRF protection

### 📊 User Analytics
- **Usage Statistics**: Track messages, chats, and activity levels
- **Achievement System**: Gamified experience with unlockable achievements
- **Progress Tracking**: Monitor your engagement and growth
- **Export Statistics**: Download your usage data

### 📝 Notion Integration
- **Seamless Sync**: Save chat conversations directly to Notion
- **Page Selection**: Choose specific Notion pages for saving
- **Auto-formatting**: Properly formatted notes in Notion
- **API Configuration**: Easy setup with Notion API

### 🎨 User Experience
- **Responsive Design**: Mobile-first responsive interface
- **Dark/Light Themes**: Customizable appearance
- **Font Size Control**: Adjustable text size for accessibility
- **Touch-friendly**: Optimized for mobile and tablet use

### ⚙️ Advanced Settings
- **Data Management**: Export or delete all user data
- **Privacy Controls**: Granular privacy settings
- **Model Training**: Opt-in/opt-out for model improvement
- **Account Management**: Complete account control

## 🛠️ Technology Stack

- **Backend**: Django 4.2.7 with Django Channels
- **Database**: PostgreSQL with optimized queries
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Authentication**: Google OAuth 2.0, Django Social Auth
- **AI Integration**: g4f library, multiple AI providers
- **Real-time**: WebSocket for live chat
- **Deployment**: Production-ready with proper logging

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Git
- Google Cloud Account (for OAuth)
- Notion Account (optional, for integration)

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/theknyazzev/g4f-website.git
cd g4f-website/premium_chat
```

### 2. Set Up Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Database Setup
```bash
# Install PostgreSQL and create database
createdb premium_chat_db

# Or using PostgreSQL prompt:
psql -U postgres
CREATE DATABASE premium_chat_db;
\q
```

### 5. Environment Configuration
Create a `.env` file in the project root:
```env
# Django Settings
SECRET_KEY=your-super-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/premium_chat_db

# Google OAuth 2.0
GOOGLE_OAUTH2_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your-google-client-secret

# Notion Integration (Optional)
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Service Configuration (Optional)
OPENAI_API_KEY=your-openai-api-key-if-needed

# Security
CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### 6. Database Migration
```bash
# Apply migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 7. Collect Static Files
```bash
python manage.py collectstatic
```

### 8. Run Development Server
```bash
python manage.py runserver
```

Visit `http://localhost:8000` to access the application.

## ⚙️ Configuration

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and OAuth 2.0
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/auth/complete/google-oauth2/`
5. Copy Client ID and Client Secret to your `.env` file

### Notion Integration Setup
1. Visit [Notion Integrations](https://www.notion.so/my-integrations)
2. Create new internal integration
3. Copy the Integration Token
4. Share your Notion page with the integration
5. Add token to `.env` file

### AI Models Configuration
The application supports multiple AI providers:
- **GPT Models**: GPT-4, GPT-4o, GPT-4o Mini
- **Gemini Models**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Qwen Models**: Qwen 2.5 Max, Qwen 2.5, Qwen 3
- **DeepSeek Models**: DeepSeek R1

No additional API keys required for basic functionality.

## 📁 Project Structure

```
premium_chat/
├── chat_app/                    # Main Django application
│   ├── migrations/             # Database migrations
│   ├── management/             # Custom management commands
│   ├── models.py              # Database models
│   ├── views.py               # View controllers
│   ├── consumers.py           # WebSocket consumers
│   ├── gpt_service.py         # AI service integration
│   ├── notion_service.py      # Notion API integration
│   ├── serializers.py         # API serializers
│   ├── signals.py             # Django signals
│   └── urls.py                # URL routing
├── chat_project/               # Django project settings
│   ├── settings.py            # Main settings
│   ├── urls.py                # Root URL configuration
│   ├── asgi.py                # ASGI configuration
│   └── wsgi.py                # WSGI configuration
├── static/                     # Static files
│   ├── styles.css             # Main stylesheet
│   ├── script.js              # Main JavaScript
│   ├── translations.js        # Internationalization
│   ├── privacy_policy.json    # Privacy policy content
│   └── terms_of_service.json  # Terms of service content
├── templates/                  # HTML templates
│   └── index.html             # Main application template
├── logs/                       # Application logs
├── manage.py                   # Django management script
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables example
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🔌 API Endpoints

### Chat API
- `POST /api/chat/send/` - Send message to AI
- `GET /api/chat/history/` - Get chat history
- `POST /api/chat/rename/` - Rename chat session
- `DELETE /api/chat/delete/{id}/` - Delete chat session

### User API
- `GET /api/user/profile/` - Get user profile
- `POST /api/user/stats/` - Get user statistics
- `POST /api/user/settings/` - Update user settings

### Notion API
- `POST /api/notion/save/` - Save chat to Notion
- `GET /api/notion/pages/` - Get available Notion pages
- `POST /api/notion/test/` - Test Notion connection

### Authentication API
- `GET /auth/login/google-oauth2/` - Google OAuth login
- `POST /auth/logout/` - User logout

## 🎯 Usage Guide

### Basic Chat
1. Open the application in your browser
2. Sign in with Google (optional but recommended)
3. Start typing in the chat input
4. Select AI model from dropdown (or use Auto mode)
5. Send messages and receive AI responses

### Image Features
1. Click the image actions button (📷)
2. Choose "Upload Image" to analyze existing images
3. Choose "Generate Image" to create new images with AI
4. Images can be viewed in full size by clicking

### Notion Integration
1. Go to Settings → Integrations → Notion
2. Follow the setup instructions to get API key
3. Enter API key and select target Notion page
4. Save messages to Notion using the save button

### Multi-language Support
1. Go to Settings → Language
2. Select your preferred language
3. Interface will update immediately

## 🚀 Deployment

### Production Settings
1. Set `DEBUG=False` in production
2. Configure proper `ALLOWED_HOSTS`
3. Use environment variables for sensitive data
4. Set up SSL/HTTPS
5. Configure proper logging
6. Use production database settings

### Docker Deployment (Optional)
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### Development Guidelines
- Follow PEP 8 style guide
- Add docstrings to functions and classes
- Write tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting
- **Database connection issues**: Check PostgreSQL service and credentials
- **Google OAuth errors**: Verify client ID and redirect URIs
- **Notion integration fails**: Ensure proper API key and page permissions
- **AI responses not working**: Check internet connection and try different models

### Getting Help
- Open an issue on GitHub for bugs
- Check existing issues for solutions
- Review documentation for setup questions

## 🔮 Roadmap

- [ ] Voice message support
- [ ] Advanced AI model fine-tuning
- [ ] Team collaboration features
- [ ] Plugin system for extensions
- [ ] Mobile app development
- [ ] Advanced analytics dashboard

## 📞 Contact

- **GitHub**: [@theknyazzev](https://github.com/theknyazzev)
- **Email**: theknyazzev@gmail.com
- **Project**: [g4f website](https://github.com/theknyazzev/g4f-website)

---

**Built with ❤️ using Django and modern web technologies**
