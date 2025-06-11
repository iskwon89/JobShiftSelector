CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"cohort" text NOT NULL,
	"selected_shifts" json NOT NULL,
	"line_id" text NOT NULL,
	"phone" text NOT NULL,
	"submitted_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"eligible" boolean NOT NULL,
	"cohort" text,
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "shift_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort" text NOT NULL,
	"location" text NOT NULL,
	"date" text NOT NULL,
	"shift" text NOT NULL,
	"rate" text NOT NULL,
	"capacity" integer DEFAULT 10 NOT NULL,
	"current_bookings" integer DEFAULT 0 NOT NULL
);
