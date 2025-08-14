# Development Guide

## Project Overview

KeepElife Premium Chat is a sophisticated Django web application that provides an advanced chat interface with AI integration. The application supports multiple AI models, real-time messaging, internationalization, and integration with external services like Notion.

## Architecture

### Backend Architecture
- **Django Framework**: Core web framework with MVT pattern
- **Django Channels**: WebSocket support for real-time communication
- **PostgreSQL**: Primary database for data persistence
- **Redis**: Session storage and WebSocket message broker
- **Social Auth**: Google OAuth 2.0 integration

### Frontend Architecture
- **Vanilla JavaScript**: No framework dependencies for maximum compatibility
- **CSS3**: Modern styling with responsive design
- **WebSocket API**: Real-time communication with backend
- **Modular Design**: Component-based JavaScript architecture

### AI Integration
- **g4f Library**: Multiple AI provider integration
- **Provider Fallback**: Automatic switching between providers
- **Model Selection**: Support for various AI models
- **Image Processing**: Upload and generation capabilities

## Development Setup

### Prerequisites
- Python 3.8+
- Node.js 16+ (for frontend tooling)
- PostgreSQL 12+
- Redis 6+
- Git

### Environment Variables
Create a `.env` file with the following variables:

```env
# Django Core
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
GOOGLE_OAUTH2_CLIENT_ID=your-client-id
GOOGLE_OAUTH2_CLIENT_SECRET=your-client-secret

# External Services
NOTION_TOKEN=your-notion-token
OPENAI_API_KEY=your-openai-key

# Security
CSRF_TRUSTED_ORIGINS=http://localhost:8000
```

### Code Style
- **Python**: Follow PEP 8, use Black formatter
- **JavaScript**: Use Prettier with 2-space indentation
- **CSS**: Use BEM methodology for class naming
- **HTML**: Semantic markup with accessibility considerations

### Testing
```bash
# Run Python tests
python manage.py test

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## Key Components

### Models (`chat_app/models.py`)
- `UserProfile`: Extended user information
- `ChatSession`: Chat conversation containers
- `ChatMessage`: Individual messages
- `UserStatistics`: Usage tracking
- `NotionIntegration`: Notion API configuration

### Views (`chat_app/views.py`)
- `ChatView`: Main chat interface
- `ChatAPIView`: RESTful chat endpoints
- `AuthenticationView`: User authentication
- `SettingsView`: User preferences

### WebSocket Consumers (`chat_app/consumers.py`)
- `ChatConsumer`: Real-time message handling
- `NotificationConsumer`: System notifications

### Services
- `GPTService`: AI model integration
- `NotionService`: Notion API wrapper
- `TranslationService`: Internationalization

## API Documentation

### Chat Endpoints
```
POST /api/chat/send/
Content-Type: application/json
{
    "message": "Hello, AI!",
    "model": "gpt-4",
    "session_id": "uuid4"
}

Response:
{
    "response": "Hello! How can I help you?",
    "session_id": "uuid4",
    "message_id": "uuid4"
}
```

### WebSocket Events
```javascript
// Send message
websocket.send(JSON.stringify({
    'type': 'chat_message',
    'message': 'Hello',
    'session_id': 'uuid4'
}));

// Receive response
{
    'type': 'ai_response',
    'message': 'Hello! How can I help?',
    'session_id': 'uuid4'
}
```

## Frontend Architecture

### JavaScript Modules
- `chat.js`: Core chat functionality
- `auth.js`: Authentication handling
- `settings.js`: User preferences
- `notion.js`: Notion integration
- `translations.js`: Internationalization

### CSS Structure
- `base.css`: Reset and base styles
- `layout.css`: Grid and flexbox layouts
- `components.css`: Reusable components
- `themes.css`: Color schemes and themes
- `responsive.css`: Mobile adaptations

### State Management
```javascript
// Global state object
window.AppState = {
    user: null,
    currentSession: null,
    settings: {},
    translations: {}
};
```

## Database Schema

### Key Relationships
```sql
UserProfile (1) -> (N) ChatSession
ChatSession (1) -> (N) ChatMessage
UserProfile (1) -> (1) UserStatistics
UserProfile (1) -> (1) NotionIntegration
```

### Indexing Strategy
- B-tree indexes on foreign keys
- Partial indexes on active sessions
- Text search indexes on message content

## Deployment

### Production Checklist
- [ ] Set `DEBUG=False`
- [ ] Configure proper `ALLOWED_HOSTS`
- [ ] Set up SSL/TLS certificates
- [ ] Configure static file serving
- [ ] Set up logging and monitoring
- [ ] Configure backup strategy
- [ ] Set up error tracking

### Docker Configuration
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "chat_project.wsgi:application"]
```

## Security Considerations

### Data Protection
- CSRF protection on all forms
- XSS prevention with template escaping
- SQL injection prevention with ORM
- Input validation and sanitization

### Authentication Security
- OAuth 2.0 with Google
- Session-based authentication
- Secure cookie configuration
- Rate limiting on auth endpoints

### API Security
- Token-based authentication for API
- Request rate limiting
- Input validation on all endpoints
- CORS configuration

## Performance Optimization

### Backend Optimization
- Database query optimization
- Redis caching for sessions
- Async views for I/O operations
- Connection pooling

### Frontend Optimization
- Lazy loading of components
- Image optimization and compression
- Minification of assets
- Browser caching strategies

## Monitoring and Logging

### Logging Configuration
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Metrics to Monitor
- Response times
- Error rates
- User activity
- Database performance
- Memory usage
- WebSocket connections

## Contributing Guidelines

### Code Review Process
1. Feature branches from `main`
2. Pull request with description
3. Automated testing
4. Code review by maintainers
5. Merge after approval

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore

### Issue Templates
- Bug report
- Feature request
- Documentation improvement
- Performance issue

## Troubleshooting

### Common Issues
1. **WebSocket connection fails**: Check Redis server and Django Channels configuration
2. **AI responses timeout**: Verify internet connection and provider status
3. **Database migration errors**: Check PostgreSQL permissions and connection
4. **Static files not loading**: Run `collectstatic` and check file permissions

### Debug Mode
Enable detailed logging in development:
```python
DEBUG = True
LOGGING_LEVEL = 'DEBUG'
```

### Performance Profiling
```bash
# Install django-debug-toolbar
pip install django-debug-toolbar

# Add to INSTALLED_APPS and middleware
```
