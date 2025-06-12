# Couflex - Job Application Portal

A sophisticated multi-step job application system for Coupang's recruitment process in Taiwan, featuring advanced form management and user-centric design.

## Features

- **Multi-step Application Process**: ID verification, shift selection, contact info collection, and Line organization integration
- **Admin Dashboard**: Manage pricing matrices, cohorts, locations, and dates
- **Excel Integration**: Upload employee data and export applications
- **Mobile-Responsive Design**: Optimized for all devices including iPhone compatibility
- **Data Integrity**: Automatic filtering of obsolete shifts and dates
- **Real-time Updates**: Dynamic pricing and availability management

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Wouter routing
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite, ESBuild
- **Containerization**: Docker, Docker Compose

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed

### 1. Clone and Build
```bash
git clone <repository-url>
cd couflex
```

### 2. Run with Docker Compose
```bash
docker-compose up -d
```

This will start:
- Application server on `http://localhost:5000`
- PostgreSQL database on port 5432

### 3. Initialize Database
```bash
# Run database migrations
docker-compose exec app npm run db:push
```

### 4. Access the Application
- **Job Application Portal**: `http://localhost:5000`
- **Admin Dashboard**: `http://localhost:5000/admin`
  - Username: `admin`
  - Password: `Adm1n!2024$SecureP@ssw0rd`

## Manual Docker Build

### Build the Image
```bash
docker build -t couflex .
```

### Run with External Database
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/database" \
  -e NODE_ENV=production \
  couflex
```

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/couflex_db
NODE_ENV=development
```

### 3. Setup Database
```bash
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
```

Application will be available at `http://localhost:5000`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |

## Application Flow

1. **ID Verification**: Employee enters National ID and provides consent
2. **Shift Selection**: Choose available shifts with color-coded rates
3. **Contact Information**: Enter phone number and Line ID
4. **Line Confirmation**: QR code for Line organization joining
5. **Completion**: Application submitted successfully

## Admin Features

- **Employee Management**: Upload Excel files with employee data
- **Shift Matrix**: Configure locations, dates, shifts, and rates
- **Cohort Management**: Create and manage different employee groups
- **Application Export**: Download applications as Excel files
- **Real-time Updates**: Modify pricing and availability

## Docker Health Checks

The application includes health checks for monitoring:
- Application: `GET /api/health`
- Database: PostgreSQL `pg_isready` check

## Data Security

- Non-root user execution in containers
- Secure admin authentication
- Input validation and sanitization
- Environment-based configuration

## Support

For deployment issues or configuration help, check the Docker logs:
```bash
docker-compose logs app
docker-compose logs db
```