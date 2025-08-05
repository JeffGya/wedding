# Wedding Site

A comprehensive wedding website platform built with Vue.js frontend and Node.js backend, featuring RSVP management, content management, guest messaging, and multilingual support.

## 🌟 Features

### Public Features
- **Multilingual Support**: English and Lithuanian languages
- **RSVP System**: Guest lookup and response management
- **Dynamic Pages**: Rich content management with customizable blocks
- **Wedding Countdown**: Configurable countdown timer
- **Responsive Design**: Mobile-first design with modern UI
- **Guest Surveys**: Customizable survey forms for guest feedback

### Admin Features
- **Dashboard**: Overview of RSVPs, messages, and site analytics
- **Guest Management**: Complete guest list with RSVP tracking
- **Content Management**: Create and edit pages with rich text editor
- **Media Management**: Upload and organize images
- **Messaging System**: Send emails to guests with templates
- **Survey Builder**: Create custom surveys with various question types
- **Settings Management**: Configure email, guest, and site settings
- **Template System**: Email template management

## ��️ Architecture

### Frontend (Vue.js 3)
- **Framework**: Vue 3 with Composition API
- **UI Library**: PrimeVue with custom Aura theme
- **Styling**: UnoCSS (utility-first CSS)
- **State Management**: Pinia
- **Routing**: Vue Router with nested layouts
- **Internationalization**: Vue I18n
- **Build Tool**: Vite
- **Validation**: VeeValidate with Yup schemas

### Backend (Node.js)
- **Framework**: Express.js
- **Database**: MySQL (production) / SQLite (development)
- **ORM**: Knex.js for database migrations and queries
- **Authentication**: Cookie-based sessions
- **File Upload**: Multer for image handling
- **Email**: Resend integration
- **Documentation**: Swagger/OpenAPI
- **Scheduling**: Node-cron for background tasks

## 📁 Project Structure

```
wedding-site/
├── apps/
│   ├── backend/                 # Node.js API server
│   │   ├── db/                 # Database models and connection
│   │   ├── helpers/            # Utility functions
│   │   ├── jobs/               # Background tasks
│   │   ├── middleware/         # Express middleware
│   │   ├── migrations/         # Database migrations
│   │   ├── routes/             # API endpoints
│   │   ├── uploads/            # File uploads
│   │   └── utils/              # Shared utilities
│   ├── frontend/               # Vue.js application
│   │   ├── public/             # Static assets
│   │   ├── src/
│   │   │   ├── api/            # API client functions
│   │   │   ├── components/     # Vue components
│   │   │   ├── layouts/        # Page layouts
│   │   │   ├── locales/        # Translation files
│   │   │   ├── router/         # Vue Router configuration
│   │   │   ├── store/          # Pinia stores
│   │   │   ├── validation/     # Form validation schemas
│   │   │   └── views/          # Page components
│   │   └── Dockerfile          # Frontend container
│   └── postmen-collections/    # API testing collections
├── package.json                 # Root workspace configuration
└── README.md                   # This file
```

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

## ��️ Database Schema

### Core Tables
- **pages**: Website content pages
- **page_translations**: Multilingual page content
- **survey_blocks**: Survey questions and blocks
- **survey_responses**: Guest survey responses
- **guests**: Guest information and RSVP status

## �� Configuration

### Frontend Environment Variables
Create `.env` in the frontend directory:
```env
VITE_API_URL=http://localhost:5001/api
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
- `npm run smoke-test`: Run API smoke tests

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
- File upload security with type validation

## �� Monitoring and Logging

- File-based logging in `apps/backend/logs/`
- Health check endpoint at `/api/health`
- Background job scheduling for email delivery
- Error tracking and debugging information

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
```