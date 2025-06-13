-- Coupang Taiwan Recruitment System Database Schema
-- Generated on June 13, 2025
-- PostgreSQL Database Schema

-- =============================================================================
-- TABLE: employees
-- Purpose: Stores employee master data for eligibility verification
-- =============================================================================
CREATE TABLE "employees" (
    "id" SERIAL PRIMARY KEY,
    "employee_id" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "cohort" TEXT
);

-- Add unique constraint for employee_id
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id");

-- =============================================================================
-- TABLE: applications
-- Purpose: Stores job applications submitted by employees
-- =============================================================================
CREATE TABLE "applications" (
    "id" SERIAL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "selected_shifts" JSON NOT NULL,
    "line_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "submitted_at" TEXT NOT NULL
);

-- =============================================================================
-- TABLE: shift_data
-- Purpose: Manages available work shifts and capacity tracking
-- =============================================================================
CREATE TABLE "shift_data" (
    "id" SERIAL PRIMARY KEY,
    "cohort" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift" TEXT NOT NULL,           -- 'DS' (Day Shift) or 'NS' (Night Shift)
    "rate" TEXT NOT NULL,            -- '1x', '1.5x', '2x' pay rates
    "capacity" INTEGER DEFAULT 10 NOT NULL,        -- Maximum applicants allowed
    "current_bookings" INTEGER DEFAULT 0 NOT NULL  -- Current number of applications
);

-- =============================================================================
-- TABLE: line_notifications
-- Purpose: Manages LINE messaging notifications for shift reminders
-- =============================================================================
CREATE TABLE "line_notifications" (
    "id" SERIAL PRIMARY KEY,
    "application_id" INTEGER NOT NULL,
    "employee_id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "shift_location" TEXT NOT NULL,
    "shift_date" TEXT NOT NULL,
    "shift_type" TEXT NOT NULL,      -- 'DS' or 'NS'
    "scheduled_for" TIMESTAMP NOT NULL,
    "sent_at" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
    "response" TEXT,                 -- LINE API response or error message
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================
ALTER TABLE "line_notifications" 
ADD CONSTRAINT "line_notifications_application_id_fkey" 
FOREIGN KEY ("application_id") REFERENCES "applications"("id");

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for employee lookup by employee_id
CREATE INDEX "idx_employees_employee_id" ON "employees"("employee_id");

-- Index for applications by employee_id
CREATE INDEX "idx_applications_employee_id" ON "applications"("employee_id");

-- Index for shift data queries by cohort and location
CREATE INDEX "idx_shift_data_cohort_location" ON "shift_data"("cohort", "location");

-- Index for shift data queries by date
CREATE INDEX "idx_shift_data_date" ON "shift_data"("date");

-- Index for pending notifications
CREATE INDEX "idx_line_notifications_status" ON "line_notifications"("status");

-- Index for scheduled notifications
CREATE INDEX "idx_line_notifications_scheduled" ON "line_notifications"("scheduled_for");

-- =============================================================================
-- SAMPLE DATA COMMENTS
-- =============================================================================

/*
SHIFT TYPES:
- DS: Day Shift
- NS: Night Shift

PAY RATES:
- 1x: Regular rate
- 1.5x: Overtime rate (1.5 times regular)
- 2x: Holiday/Premium rate (2 times regular)

NOTIFICATION STATUS:
- pending: Notification scheduled but not sent
- sent: Successfully sent via LINE API
- failed: Failed to send (check response field for error details)

COHORT EXAMPLES:
- 2025-Q1: First quarter 2025 recruitment
- 2025-Q2: Second quarter 2025 recruitment
- TEMP-2025: Temporary worker recruitment 2025

SELECTED_SHIFTS JSON FORMAT:
[
  {
    "location": "Taipei Warehouse",
    "date": "2025-07-01",
    "shift": "DS",
    "rate": "1x"
  },
  {
    "location": "Kaohsiung Hub",
    "date": "2025-07-02",
    "shift": "NS", 
    "rate": "1.5x"
  }
]
*/

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================