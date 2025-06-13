# Coupang Taiwan Recruitment System - Technical Design Document

**Version:** 1.0  
**Date:** June 13, 2025  
**Project:** Multi-step Job Application System with LINE Integration  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Data Model](#data-model)
5. [Application Flow](#application-flow)
6. [API Design](#api-design)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [LINE Integration](#line-integration)
10. [Security Considerations](#security-considerations)
11. [Performance & Scalability](#performance--scalability)
12. [Deployment](#deployment)
13. [Monitoring & Logging](#monitoring--logging)

---

## System Overview

### Purpose
A sophisticated multi-step job application system designed for Coupang's recruitment process in Taiwan, featuring real-time shift management, capacity tracking, and automated LINE messaging notifications.

### Key Features
- **Multi-step Application Process**: ID verification → shift selection → contact info → LINE confirmation
- **Real-time Capacity Management**: Dynamic shift availability with booking limits
- **LINE Messaging Integration**: Automated shift reminders and notifications
- **Mobile-first Design**: Responsive interface optimized for mobile devices
- **Multi-language Support**: English and Chinese localization
- **Administrative Dashboard**: Comprehensive management tools for HR teams

### Business Requirements
- Handle concurrent applications during peak recruitment periods
- Ensure data integrity for shift capacity management
- Provide seamless user experience across devices
- Integrate with LINE messaging platform for notifications
- Support multiple recruitment cohorts simultaneously

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  Express.js     │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   LINE Bot API  │
                       │   (External)    │
                       └─────────────────┘
```

### Component Architecture

```
Frontend (React)
├── Components/
│   ├── Form Components (ID verification, shift selection, contact info)
│   ├── UI Components (buttons, modals, date pickers)
│   └── Layout Components (header, step indicator)
├── Hooks/
│   ├── Custom hooks for API calls
│   └── State management hooks
└── Utils/
    ├── Validation schemas
    └── Helper functions

Backend (Express.js)
├── Routes/
│   ├── Employee management
│   ├── Application processing
│   ├── Shift data management
│   └── LINE notification handling
├── Services/
│   ├── LINE messaging service
│   ├── Database storage service
│   └── Notification scheduler
└── Middleware/
    ├── Request validation
    ├── Error handling
    └── CORS configuration
```

---

## Technology Stack

### Frontend
- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe JavaScript development
- **Wouter**: Lightweight client-side routing
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Pre-built accessible UI components
- **Zod**: Runtime type validation

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **TypeScript**: Type-safe server development
- **Drizzle ORM**: Type-safe database toolkit
- **PostgreSQL**: Relational database system
- **LINE Bot SDK**: Official LINE messaging API client
- **Node-cron**: Task scheduling for notifications

### Development Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: Fast JavaScript bundler
- **Drizzle Kit**: Database migration tool
- **TSX**: TypeScript execution environment

### External Services
- **LINE Messaging API**: For automated notifications
- **Replit**: Development and hosting platform

---

## Data Model

### Core Entities

#### Employee
```typescript
interface Employee {
  id: number;
  employeeId: string;    // Unique company identifier
  name: string;
  eligible: boolean;     // Recruitment eligibility
  cohort?: string;       // Assigned recruitment cohort
}
```

#### Application
```typescript
interface Application {
  id: number;
  employeeId: string;
  name: string;
  cohort: string;
  selectedShifts: ShiftSelection[];  // JSON array
  lineId: string;
  phone: string;
  submittedAt: string;
}
```

#### ShiftData
```typescript
interface ShiftData {
  id: number;
  cohort: string;
  location: string;
  date: string;
  shift: 'DS' | 'NS';           // Day/Night shift
  rate: '1x' | '1.5x' | '2x';   // Pay multiplier
  capacity: number;             // Maximum applicants
  currentBookings: number;      // Current applications
}
```

#### LineNotification
```typescript
interface LineNotification {
  id: number;
  applicationId: number;
  employeeId: string;
  lineId: string;
  shiftLocation: string;
  shiftDate: string;
  shiftType: 'DS' | 'NS';
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  response?: string;
  createdAt: Date;
}
```

### Relationships
- One Employee can have multiple Applications
- One Application can generate multiple LINE Notifications
- ShiftData tracks capacity across cohorts and locations

---

## Application Flow

### User Journey

```
1. Landing Page
   ↓
2. ID Verification
   ├── Enter Employee ID
   ├── System validates eligibility
   └── Retrieves user data and cohort
   ↓
3. Shift Selection
   ├── Display available shifts for cohort
   ├── Show capacity and rates
   ├── Allow multiple shift selection
   └── Real-time capacity updates
   ↓
4. Contact Information
   ├── Enter LINE ID
   ├── Enter phone number
   └── Form validation
   ↓
5. LINE Confirmation
   ├── Display application summary
   ├── QR code for LINE integration
   └── Submit application
   ↓
6. Confirmation Page
   └── Application submitted successfully
```

### State Management

```typescript
// Application state flow
interface ApplicationState {
  step: 1 | 2 | 3 | 4 | 5;
  userData?: UserData;
  selectedShifts: ShiftSelection[];
  contactInfo?: ContactInfo;
  applicationId?: string;
  isSubmitting: boolean;
  error?: string;
}
```

---

## API Design

### RESTful Endpoints

#### Employee Management
```
GET    /api/employees/:employeeId     - Verify employee eligibility
POST   /api/employees/bulk            - Bulk import employees
DELETE /api/employees                 - Clear all employees
```

#### Application Processing
```
POST   /api/applications              - Submit new application
GET    /api/applications              - List all applications
GET    /api/applications/:id          - Get specific application
PUT    /api/applications/:id          - Update application
GET    /api/applications/employee/:employeeId/latest - Get latest application
```

#### Shift Management
```
GET    /api/shifts/:cohort            - Get available shifts for cohort
POST   /api/shifts                    - Create new shift data
PUT    /api/shifts/:id                - Update shift capacity
POST   /api/shifts/:id/book           - Book shift slot
```

#### LINE Notifications
```
POST   /api/notifications             - Schedule notification
GET    /api/notifications/pending     - Get pending notifications
PUT    /api/notifications/:id/status  - Update notification status
GET    /api/notifications/logs        - Get notification logs
```

### Request/Response Examples

#### Submit Application
```typescript
// POST /api/applications
Request: {
  employeeId: "EMP001",
  name: "John Doe",
  cohort: "2025-Q2",
  selectedShifts: [
    {
      location: "Taipei Warehouse",
      date: "2025-07-01",
      shift: "DS",
      rate: "1x"
    }
  ],
  lineId: "@johndoe",
  phone: "+886912345678"
}

Response: {
  id: 123,
  status: "success",
  message: "Application submitted successfully"
}
```

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── id-verification-form.tsx      - Employee ID validation
│   ├── shift-selection-grid.tsx      - Interactive shift picker
│   ├── contact-info-form.tsx         - Contact details form
│   ├── line-confirmation.tsx         - Final confirmation step
│   ├── step-indicator.tsx            - Progress indicator
│   ├── header.tsx                    - App header with navigation
│   ├── language-toggle.tsx           - Language switcher
│   ├── date-picker.tsx               - Custom date picker
│   └── file-upload.tsx               - Excel file upload
├── hooks/
│   ├── use-toast.ts                  - Toast notifications
│   └── use-language.ts               - Internationalization
├── lib/
│   ├── queryClient.ts                - TanStack Query setup
│   └── utils.ts                      - Utility functions
└── App.tsx                           - Main application router
```

### State Management Strategy

- **Server State**: TanStack Query for API data caching
- **Form State**: React Hook Form for form management
- **Application State**: React useState for step progression
- **Global State**: Context API for language preferences

### Form Validation

```typescript
// Zod schemas for runtime validation
const contactInfoSchema = z.object({
  lineId: z.string().min(1, "LINE ID is required"),
  phone: z.string().min(1, "Phone number is required")
});

const shiftSelectionSchema = z.object({
  location: z.string(),
  date: z.string(),
  shift: z.enum(['DS', 'NS']),
  rate: z.string()
});
```

---

## Backend Architecture

### Service Layer

#### Storage Service
```typescript
interface IStorage {
  // Employee operations
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  
  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getLatestApplicationByEmployeeId(employeeId: string): Promise<Application | undefined>;
  
  // Shift management
  getShiftDataByCohort(cohort: string): Promise<ShiftData[]>;
  incrementShiftBookings(cohort: string, location: string, date: string, shift: string): Promise<void>;
  
  // Notification handling
  createLineNotification(notification: InsertLineNotification): Promise<LineNotification>;
  getPendingNotifications(): Promise<LineNotification[]>;
}
```

#### LINE Service
```typescript
class LineService {
  // Send shift reminder to user
  async sendShiftReminder(lineId: string, reminderData: ShiftReminderData): Promise<void>;
  
  // Schedule notifications for application
  async scheduleNotificationsForApplication(applicationId: number): Promise<void>;
  
  // Process pending notifications (cron job)
  async processPendingNotifications(): Promise<void>;
}
```

### Database Layer

- **Drizzle ORM**: Type-safe database operations
- **Connection Pooling**: PostgreSQL connection management
- **Migration System**: Version-controlled schema changes
- **Transaction Support**: ACID compliance for critical operations

### Error Handling

```typescript
// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid input data' });
  }
  
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## LINE Integration

### Notification System

#### Message Templates
```typescript
// Shift reminder message format
const shiftReminderTemplate = `
🏢 Coupang Shift Reminder

Hello {name}!
You have an upcoming shift:

📍 Location: {location}
📅 Date: {date}
⏰ Time: {shiftTime}
💰 Rate: {rate}

Please arrive 15 minutes early.
Good luck! 💪
`;
```

#### Scheduling Logic
```typescript
// Schedule reminders 24 hours before shift
const scheduleNotification = (shiftDate: string, applicationId: number) => {
  const shiftDateTime = new Date(shiftDate);
  const reminderTime = new Date(shiftDateTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
  
  return {
    applicationId,
    scheduledFor: reminderTime,
    status: 'pending'
  };
};
```

#### Cron Job Processing
```typescript
// Daily cron job at 9 AM Taiwan time (UTC+8)
cron.schedule('0 9 * * *', async () => {
  await lineService.processPendingNotifications();
}, {
  timezone: "Asia/Taipei"
});
```

### Error Handling
- **Retry Logic**: Failed messages retry with exponential backoff
- **Status Tracking**: All notification attempts logged with timestamps
- **Fallback Options**: SMS backup for critical notifications (future enhancement)

---

## Security Considerations

### Data Protection
- **Input Validation**: All user inputs validated with Zod schemas
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: React's built-in XSS prevention
- **CORS Configuration**: Restricted cross-origin requests

### API Security
- **Rate Limiting**: Prevent abuse of application endpoints
- **Request Size Limits**: Protect against large payload attacks
- **Environment Variables**: Sensitive data stored securely
- **HTTPS Only**: All communications encrypted in production

### LINE Integration Security
- **Webhook Verification**: Validate LINE webhook signatures
- **Token Management**: Secure storage of LINE channel access tokens
- **User Consent**: Clear privacy policy for LINE data usage

---

## Performance & Scalability

### Frontend Optimization
- **Code Splitting**: Lazy loading for route components
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Responsive images and lazy loading
- **Caching Strategy**: Browser and CDN caching

### Backend Optimization
- **Database Indexing**: Optimized queries for common operations
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimize N+1 query problems
- **Response Compression**: Gzip compression for API responses

### Capacity Planning
- **Concurrent Users**: Support 100+ simultaneous applications
- **Database Load**: Optimized for read-heavy shift data queries
- **LINE API Limits**: Respect rate limits and implement queuing
- **Horizontal Scaling**: Stateless design for multi-instance deployment

---

## Deployment

### Production Environment
- **Platform**: Replit Deployments
- **Database**: PostgreSQL with automated backups
- **SSL/TLS**: Automatic HTTPS certificate management
- **Domain**: Custom domain support (.replit.app default)

### CI/CD Pipeline
```yaml
# Automated deployment workflow
Build Process:
1. TypeScript compilation
2. Frontend bundle optimization
3. Database migration execution
4. Environment variable validation
5. Health check verification
```

### Environment Configuration
```bash
# Required environment variables
DATABASE_URL=postgresql://...
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
NODE_ENV=production
PORT=5000
```

---

## Monitoring & Logging

### Application Monitoring
- **Health Checks**: API endpoint monitoring
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Centralized error logging
- **Usage Analytics**: Application flow analysis

### LINE Integration Monitoring
- **Message Delivery**: Success/failure rate tracking
- **API Usage**: Rate limit monitoring
- **Queue Status**: Pending notification tracking
- **Error Analysis**: Failed message categorization

### Database Monitoring
- **Query Performance**: Slow query identification
- **Connection Pool**: Usage and capacity monitoring
- **Storage Usage**: Database size tracking
- **Backup Status**: Automated backup verification

### Log Management
```typescript
// Structured logging format
const log = {
  timestamp: new Date().toISOString(),
  level: 'info' | 'warn' | 'error',
  service: 'frontend' | 'backend' | 'line-service',
  message: string,
  context: object,
  userId?: string,
  requestId?: string
};
```

---

## Future Enhancements

### Short-term (1-3 months)
- **SMS Backup**: Alternative notification channel
- **Excel Export**: Application data export functionality
- **Advanced Filtering**: Enhanced admin dashboard filters
- **Audit Trail**: Complete action history tracking

### Medium-term (3-6 months)
- **Mobile App**: Native iOS/Android applications
- **Push Notifications**: Browser push notification support
- **Advanced Analytics**: Detailed recruitment metrics
- **API Documentation**: Interactive API documentation

### Long-term (6+ months)
- **Multi-tenant Support**: Multiple company support
- **AI Integration**: Intelligent shift recommendation
- **Advanced Scheduling**: Complex shift pattern support
- **Integration Hub**: Third-party HR system integration

---

## Conclusion

This technical design document outlines a robust, scalable recruitment application system that leverages modern web technologies to provide an exceptional user experience while maintaining high performance and security standards. The modular architecture ensures maintainability and allows for future enhancements to meet evolving business requirements.

---

**Document Status**: Complete  
**Next Review**: July 13, 2025  
**Contact**: Development Team