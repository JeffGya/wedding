# Wedding Site

A comprehensive wedding website platform built with Vue.js frontend and Node.js backend, featuring RSVP management, content management, guest messaging, and multilingual support.

## 🌟 Features

### Public Features
- **Multilingual Support**: English and Lithuanian languages
- **RSVP System**: Guest lookup and response management with rate limiting
- **Dynamic Pages**: Rich content management with customizable blocks
- **Wedding Countdown**: Configurable countdown timer
- **Responsive Design**: Mobile-first design with modern UI
- **Guest Surveys**: Customizable survey forms for guest feedback
- **Guest Session Management**: Secure guest access without authentication

### Admin Features
- **Dashboard**: Overview of RSVPs, messages, and site analytics
- **Guest Management**: Complete guest list with RSVP tracking
- **Content Management**: Create and edit pages with rich text editor
- **Media Management**: Upload and organize images with security validation
- **Messaging System**: Send emails to guests with templates and scheduling
- **Survey Builder**: Create custom surveys with various question types
- **Settings Management**: Configure email, guest, and site settings
- **Template System**: Email template management with variables

## ️ Architecture

### Frontend (Vue.js 3)
- **Framework**: Vue 3 with Composition API
- **UI Library**: PrimeVue v4 with custom Aura theme
- **Styling**: UnoCSS (utility-first CSS) with custom design tokens
- **State Management**: Pinia
- **Routing**: Vue Router with nested layouts
- **Internationalization**: Vue I18n
- **Build Tool**: Vite with optimized chunk splitting
- **Validation**: VeeValidate with Yup schemas
- **Icons**: Solar Icons via Iconify

### Backend (Node.js)
- **Framework**: Express.js 5.x
- **Database**: MySQL (production) / SQLite (development)
- **ORM**: Knex.js for database migrations and queries
- **Authentication**: Cookie-based sessions with secure flags
- **File Upload**: Multer with security validation
- **Email**: Resend integration with template system
- **Documentation**: Swagger/OpenAPI
- **Scheduling**: Node-cron for background email tasks
- **Rate Limiting**: RSVP lookup protection

## 📁 Project Structure

```
wedding-site/
├── apps/
│   ├── backend/                 # Node.js API server
│   │   ├── db/                 # Database models and connection
│   │   ├── helpers/            # Utility functions and services
│   │   ├── jobs/               # Background tasks and scheduling
│   │   ├── middleware/         # Express middleware (auth, guest sessions)
│   │   ├── migrations/         # Database migrations
│   │   ├── routes/             # API endpoints
│   │   ├── uploads/            # File uploads
│   │   ├── utils/              # Shared utilities
│   │   └── scripts/            # Database seeding and utilities
│   ├── frontend/               # Vue.js application
│   │   ├── public/             # Static assets and fonts
│   │   ├── src/
│   │   │   ├── api/            # API client functions
│   │   │   ├── components/     # Vue components
│   │   │   ├── layouts/        # Page layouts
│   │   │   ├── locales/        # Translation files
│   │   │   ├── router/         # Vue Router configuration
│   │   │   ├── store/          # Pinia stores
│   │   │   ├── validation/     # Form validation schemas
│   │   │   └── views/          # Page components
│   │   └── uno.config.js       # UnoCSS configuration
│   └── postmen-collections/    # API testing collections
├── package.json                 # Root workspace configuration
└── README.md                   # This file
```

## Quick Win Adjustments/Improvements

### Security Quick Wins
- **Add Security Headers**: Implement helmet.js middleware for security headers (XSS protection, content security policy)
- **Rate Limiting Expansion**: Apply rate limiting to login attempts and file uploads to prevent abuse
- **Input Validation**: Add express-validator to all routes for consistent input sanitization
- **Session Security**: Implement session rotation and absolute session timeout for better security
- **File Upload Validation**: Add virus scanning and stricter file type validation for uploads

### Performance Quick Wins
- **Database Connection Pooling**: Optimize MySQL connection pool settings for production load
- **Response Compression**: Add compression middleware for API responses to reduce bandwidth
- **Static Asset Caching**: Implement proper cache headers for static assets and API responses
- **Image Optimization**: Add image compression and WebP conversion for better loading times
- **API Response Pagination**: Implement pagination for large data sets to improve response times

### Reliability Quick Wins
- **Health Check Enhancement**: Add database connectivity and external service health checks
- **Graceful Shutdown**: Implement proper server shutdown handling for database connections
- **Error Monitoring**: Add error tracking service integration for production monitoring
- **Backup Strategy**: Implement automated database backup procedures
- **Log Rotation**: Add log rotation to prevent disk space issues in production

### Development Experience Quick Wins
- **Environment Validation**: Add environment variable validation on startup to catch configuration errors early
- **Development Tools**: Add nodemon configuration for better development experience
- **Code Formatting**: Implement Prettier and ESLint for consistent code style
- **Git Hooks**: Add pre-commit hooks for code quality checks
- **Dependency Updates**: Regular security updates and dependency vulnerability scanning

### Monitoring and Observability Quick Wins
- **Request Logging**: Implement structured logging for all API requests with performance metrics
- **Database Query Monitoring**: Add query performance monitoring and slow query logging
- **Memory Usage Monitoring**: Implement memory leak detection and monitoring
- **Uptime Monitoring**: Add external uptime monitoring service integration
- **Performance Metrics**: Implement response time tracking and alerting

These quick wins focus on immediate improvements that can be implemented without major architectural changes, providing significant security, performance, and reliability benefits for production deployment.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MySQL (for production) or SQLite (for development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd wedding-site
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   
   Create environment files in the backend directory:
   
   **Development** (`.env`):
   ```env
   NODE_ENV=development
   PORT=5001
   DB_TYPE=sqlite
   DB_PATH=./database.sqlite
   SESSION_SECRET=your-session-secret
   RSVP_SESSION_SECRET=your-rsvp-secret
   CORS_ORIGINS=http://localhost:5173
   LOG_LEVEL=debug
   ```
   
   **Production** (`.env-production`):
   ```env
   NODE_ENV=production
   PORT=5001
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your-db-user
   DB_PASS=your-db-password
   DB_NAME=wedding_site
   SESSION_SECRET=your-session-secret
   RSVP_SESSION_SECRET=your-rsvp-secret
   CORS_ORIGINS=https://yourdomain.com
   RESEND_API_KEY=your-resend-api-key
   SITE_URL=https://yourdomain.com
   LOG_LEVEL=warn
   ```

4. **Database Setup**:
   
   **For SQLite (development)**:
   ```bash
   npm run migrate --workspace apps/backend
   npm run seed:dev --workspace apps/backend
   ```
   
   **For MySQL (production)**:
   ```bash
   # Import baseline schema
   npm run import:baseline --workspace apps/backend
   
   # Run migrations
   npm run migrate --workspace apps/backend
   
   # Seed data
   npm run seed:mysql --workspace apps/backend
   ```

### Development

**Start both frontend and backend**:
```bash
npm run dev
```

**Start only frontend**:
```bash
npm run dev:frontend
```

**Start only backend**:
```bash
npm run dev:backend
```

### Production Build

**Build frontend**:
```bash
npm run build
```

**Start production servers**:
```bash
npm start
```

## 🐳 Docker Deployment

The frontend includes a Dockerfile for containerized deployment:

```bash
# Build frontend container
cd apps/frontend
docker build -t wedding-site-frontend .

# Run with nginx reverse proxy
docker run -p 80:80 wedding-site-frontend
```

## 📚 API Documentation

The backend includes Swagger documentation available at `/api/docs` when running.

### Key API Endpoints

- **Authentication**: `/api/auth/*`
- **Admin**: `/api/admin/*`
- **Public Pages**: `/api/pages/*`
- **RSVP**: `/api/rsvp/*`
- **Guests**: `/api/guests/*`
- **Surveys**: `/api/surveys/*`
- **Settings**: `/api/settings/*`
- **Messages**: `/api/messages/*`
- **Images**: `/api/admin/images/*`

## ️ Database Schema

### Core Tables
- **pages**: Website content pages
- **page_translations**: Multilingual page content
- **survey_blocks**: Survey questions and blocks
- **survey_responses**: Guest survey responses
- **guests**: Guest information and RSVP status
- **images**: Media management
- **messages**: Email communication system

## ⚙️ Configuration

### Frontend Environment Variables
Create `.env` in the frontend directory:
```env
VITE_API_URL=http://localhost:5001/api
VITE_APP_TITLE=Brigita + Jeffrey
VITE_ENABLE_LOGS=false
```

### Backend Environment Variables
See the environment setup section above for required variables.

## 🧪 Testing

**Run backend smoke tests**:
```bash
npm run smoke-test --workspace apps/backend
```

**API Testing**:
Use the included Postman collections in `apps/postmen-collections/` for comprehensive API testing.

## 📦 Available Scripts

### Root Level
- `npm run dev`: Start both frontend and backend in development
- `npm run build`: Build frontend for production
- `npm start`: Start production servers

### Backend
- `npm run dev`: Start development server with nodemon
- `npm run migrate`: Run database migrations
- `npm run seed:dev`: Seed development database
- `npm run seed:mysql`: Seed MySQL database
- `npm run smoke-test`: Run API smoke tests
- `npm run import:baseline`: Import MySQL baseline schema

### Frontend
- `npm run dev`: Start Vite development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

## 🌍 Internationalization

The application supports multiple languages:
- **English** (`en`): Default language
- **Lithuanian** (`lt`): Secondary language

Translation files are located in `apps/frontend/src/locales/`.

## 🔐 Security Features

- Cookie-based authentication with secure session management
- CORS configuration for production environments
- Input validation and sanitization
- SQL injection protection through parameterized queries
- File upload security with type and size validation
- Rate limiting for RSVP lookups
- Secure cookie flags (httpOnly, sameSite, secure)
- Guest session management without authentication

##  Monitoring and Logging

- Configurable logging levels via LOG_LEVEL environment variable
- File-based logging in `apps/backend/logs/`
- Health check endpoint at `/api/health`
- Background job scheduling for email delivery
- Error tracking and debugging information
- Frontend logging controlled via VITE_ENABLE_LOGS

## 🎨 Design System

- **Typography**: Great Vibes (cursive), Lora (serif), Open Sans (sans-serif)
- **Color Scheme**: Custom design tokens with light/dark mode support
- **Icons**: Solar Icons collection
- **Spacing**: 8px increment system
- **Responsive**: Mobile-first design approach

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for modern wedding websites**

## 🔧 Refactoring and Improvement Areas

### Code Quality and Architecture
- **Database Connection Management**: Consolidate SQLite/MySQL conditional logic into unified abstraction layer
- **Route Organization**: Group related routes into feature modules for better maintainability
- **Error Handling**: Implement consistent error handling patterns across all routes
- **Validation**: Standardize input validation using express-validator or Joi consistently
- **Type Safety**: Consider adding TypeScript for better development experience and error prevention

### Frontend Components
- **Component Composition**: Break down large components into smaller, reusable pieces
- **State Management**: Optimize Pinia store structure for better performance
- **Form Handling**: Standardize form validation and error display patterns
- **Loading States**: Implement consistent loading state management across components

### Performance Optimizations
- **Image Optimization**: Implement lazy loading and responsive images
- **Bundle Splitting**: Further optimize Vite build configuration for better caching
- **API Caching**: Add response caching for static content
- **Database Queries**: Optimize database queries and add proper indexing

### Security Enhancements
- **Input Sanitization**: Implement consistent input sanitization across all endpoints
- **Rate Limiting**: Add rate limiting to more endpoints beyond RSVP
- **Security Headers**: Implement security headers middleware
- **Audit Logging**: Add comprehensive audit logging for admin actions

### Testing and Quality Assurance
- **Unit Tests**: Add comprehensive unit tests for components and utilities
- **Integration Tests**: Implement API integration tests
- **E2E Tests**: Add end-to-end testing for critical user flows
- **Code Coverage**: Establish minimum code coverage requirements

### Documentation and Developer Experience
- **API Documentation**: Enhance Swagger documentation with examples
- **Component Documentation**: Add Storybook or similar for component documentation
- **Development Guidelines**: Create coding standards and contribution guidelines
- **Environment Templates**: Provide comprehensive environment variable documentation