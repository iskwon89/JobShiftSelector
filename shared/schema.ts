import { pgTable, text, serial, boolean, json, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  name: text("name").notNull(),
  eligible: boolean("eligible").notNull(),
  cohort: text("cohort"),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull(),
  name: text("name").notNull(),
  cohort: text("cohort").notNull(),
  selectedShifts: json("selected_shifts").notNull(),
  lineId: text("line_id").notNull(),
  phone: text("phone").notNull(),
  submittedAt: text("submitted_at").notNull(),
});

export const shiftData = pgTable("shift_data", {
  id: serial("id").primaryKey(),
  cohort: text("cohort").notNull(),
  location: text("location").notNull(),
  date: text("date").notNull(),
  shift: text("shift").notNull(), // DS or NS
  rate: text("rate").notNull(), // 1x, 1.5x, 2x
  capacity: integer("capacity").default(10).notNull(), // Maximum number of applicants
  currentBookings: integer("current_bookings").default(0).notNull(), // Current number of applications
});

export const lineNotifications = pgTable("line_notifications", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => applications.id),
  employeeId: text("employee_id").notNull(),
  lineId: text("line_id").notNull(),
  shiftLocation: text("shift_location").notNull(),
  shiftDate: text("shift_date").notNull(),
  shiftType: text("shift_type").notNull(), // 'DS' or 'NS'
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed'
  response: text("response"), // LINE API response or error message
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  employeeId: true,
  name: true,
  eligible: true,
  cohort: true,
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  employeeId: true,
  name: true,
  cohort: true,
  selectedShifts: true,
  lineId: true,
  phone: true,
});

export const shiftSelectionSchema = z.object({
  location: z.string(),
  date: z.string(),
  shift: z.enum(['DS', 'NS']),
  rate: z.string(),
});

export const contactInfoSchema = z.object({
  lineId: z.string().min(1, "LINE ID is required"),
  phone: z.string().min(1, "Phone number is required"),
});

export const insertLineNotificationSchema = createInsertSchema(lineNotifications).pick({
  applicationId: true,
  employeeId: true,
  lineId: true,
  shiftLocation: true,
  shiftDate: true,
  shiftType: true,
  scheduledFor: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type ShiftData = typeof shiftData.$inferSelect;
export type ShiftSelection = z.infer<typeof shiftSelectionSchema>;
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type LineNotification = typeof lineNotifications.$inferSelect;
export type InsertLineNotification = z.infer<typeof insertLineNotificationSchema>;
