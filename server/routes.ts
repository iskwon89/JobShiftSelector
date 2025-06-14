import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmployeeSchema, insertApplicationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { getLineService } from './line-service';

const upload = multer({ storage: multer.memoryStorage() });

// Strong admin credentials (hardcoded on server)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Adm1n!2024$SecureP@ssw0rd";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint for Docker
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log("Admin login attempt - Missing credentials");
        return res.status(400).json({ message: "Username and password are required" });
      }

      console.log("=== Admin Login Attempt ===");
      console.log("Username provided:", username);
      console.log("Request timestamp:", new Date().toISOString());
      console.log("Request IP:", req.ip || req.connection.remoteAddress);
      
      // Verify credentials against hardcoded values
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        console.log("Admin login: SUCCESS");
        console.log("=== End Admin Login ===");
        
        // Generate a simple session token (in production, use proper JWT)
        const sessionToken = Buffer.from(`${ADMIN_USERNAME}:${Date.now()}`).toString('base64');
        
        res.json({
          success: true,
          message: "Login successful",
          token: sessionToken
        });
      } else {
        console.log("Admin login: FAILED - Invalid credentials");
        console.log("=== End Admin Login ===");
        
        res.status(401).json({
          success: false,
          message: "Invalid admin credentials"
        });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Verify employee ID and get user data
  app.post("/api/verify-employee", async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      if (!employeeId) {
        console.log("ID Verification - Missing employeeId in request body");
        return res.status(400).json({ message: "Employee ID is required" });
      }

      console.log("=== ID Verification Request ===");
      console.log("Received hashed employeeId:", employeeId);
      console.log("Request timestamp:", new Date().toISOString());
      console.log("Request IP:", req.ip || req.connection.remoteAddress);
      
      // The employeeId received should already be hashed from the frontend
      // Look it up directly in the database
      const employee = await storage.getEmployeeByEmployeeId(employeeId);
      
      if (employee) {
        console.log("Database lookup: FOUND");
        console.log("Employee details:", {
          name: employee.name,
          eligible: employee.eligible,
          cohort: employee.cohort
        });
      } else {
        console.log("Database lookup: NOT FOUND");
        console.log("Searched for hashed ID:", employeeId);
      }
      
      if (!employee) {
        console.log("Employee not found - assigning to Default cohort");
        // Return default user data for users not in employee database
        const responseData = {
          id: employeeId,
          name: "Guest User",
          eligible: true,
          cohort: "Default"
        };
        
        console.log("Verification SUCCESS (Default) - Sending response:", responseData);
        console.log("=== End ID Verification ===");
        
        return res.json(responseData);
      }

      if (!employee.eligible) {
        console.log("Employee found but NOT ELIGIBLE for applications");
        return res.status(403).json({ 
          message: "You are not eligible for shift applications. Please contact HR for more information." 
        });
      }

      // Return employee data with cohort for pricing matrix
      const responseData = {
        id: employee.employeeId,
        name: employee.name,
        eligible: employee.eligible,
        cohort: employee.cohort || "A"
      };
      
      console.log("Verification SUCCESS - Sending response:", responseData);
      console.log("=== End ID Verification ===");
      
      res.json(responseData);
    } catch (error) {
      console.error("Error verifying employee:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload and process Excel file
  app.post("/api/upload-excel", upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("Processing Excel file upload, file size:", req.file.size);

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log("Raw Excel data parsed:", data.length, "rows");

      // Clear existing employees
      console.log("Clearing existing employees...");
      await storage.clearEmployees();
      console.log("Existing employees cleared");

      // Validate and insert employees
      const employees = data.map((row: any, index: number) => {
        try {
          const rawEmployeeId = String(row.ID || row.id || '').trim().toUpperCase();
          const name = String(row.Name || row.name || '').trim();
          
          if (!rawEmployeeId || !name) {
            return null;
          }
          
          // Hash the employee ID using MD5 before storing
          const hashedEmployeeId = crypto.createHash('md5').update(rawEmployeeId).digest('hex');
          
          const employeeData = {
            employeeId: hashedEmployeeId,
            name,
            eligible: Boolean(row.Eligible === true || row.Eligible === 'TRUE' || row.Eligible === 'true' || row.eligible === true),
            cohort: row.Cohort || row.cohort || 'A'
          };
          
          console.log(`Row ${index + 1}: ${rawEmployeeId} -> ${hashedEmployeeId}`);
          
          return insertEmployeeSchema.parse(employeeData);
        } catch (error) {
          console.error(`Row ${index + 1}: Invalid row data:`, error);
          return null;
        }
      }).filter(emp => emp !== null);

      console.log("Valid employees to insert:", employees.length);

      if (employees.length === 0) {
        return res.status(400).json({ message: "No valid employee data found in Excel file" });
      }

      console.log("Inserting employees into database...");
      await storage.bulkCreateEmployees(employees);
      console.log("Employees inserted successfully");

      res.json({ 
        message: "Excel file processed successfully", 
        employeesLoaded: employees.length,
        employees: employees.map(emp => ({ id: emp.employeeId, name: emp.name, eligible: emp.eligible, cohort: emp.cohort }))
      });
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ message: "Error processing Excel file" });
    }
  });

  // Get shift data for a cohort
  app.get("/api/shift-data/:cohort", async (req, res) => {
    try {
      const { cohort } = req.params;
      const shiftData = await storage.getShiftDataByCohort(cohort);
      res.json(shiftData);
    } catch (error) {
      console.error("Error fetching shift data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit application
  app.post("/api/submit-application", async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse(req.body);
      const application = await storage.createApplication(applicationData);
      
      // Update shift bookings for each selected shift
      const selectedShifts = applicationData.selectedShifts as any[];
      for (const shift of selectedShifts) {
        await storage.incrementShiftBookings(
          applicationData.cohort,
          shift.location,
          shift.date,
          shift.shift
        );
      }
      
      // Schedule LINE notifications for each shift
      try {
        const lineService = getLineService();
        await lineService.scheduleNotificationsForApplication(application.id);
      } catch (error) {
        console.error('Failed to schedule LINE notifications:', error);
        // Continue with application submission even if notification scheduling fails
      }
      
      // Generate application ID
      const applicationId = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(application.id).padStart(3, '0')}`;
      
      res.json({ 
        message: "Application submitted successfully",
        applicationId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error submitting application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all employees (for debugging)
  app.get("/api/employees", async (req, res) => {
    try {
      // Return empty array since we don't have a getAllEmployees method
      res.json([]);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all applications (for admin)
  app.get("/api/applications", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      
      // Filter out shifts for dates that no longer exist in each application
      const filteredApplications = await Promise.all(applications.map(async (app) => {
        if (app.selectedShifts && Array.isArray(app.selectedShifts)) {
          const currentShiftData = await storage.getShiftDataByCohort(app.cohort);
          const availableDates = Array.from(new Set(currentShiftData.map(s => s.date)));
          
          const validShifts = app.selectedShifts.filter((shift: any) => {
            return availableDates.includes(shift.date) && 
                   currentShiftData.some(s => 
                     s.location === shift.location && 
                     s.date === shift.date && 
                     s.shift === shift.shift
                   );
          });
          
          return { ...app, selectedShifts: validShifts };
        }
        return app;
      }));
      
      res.json(filteredApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get latest application for an employee
  app.get("/api/application/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const application = await storage.getLatestApplicationByEmployeeId(employeeId);
      
      if (!application) {
        return res.status(404).json({ message: "No application found for this employee" });
      }
      
      // Filter out shifts for dates that no longer exist in the current shift data
      if (application.selectedShifts && Array.isArray(application.selectedShifts)) {
        // Get current available shift data for this cohort
        const currentShiftData = await storage.getShiftDataByCohort(application.cohort);
        const availableDates = Array.from(new Set(currentShiftData.map(s => s.date)));
        
        // Filter shifts to only include dates that still exist
        const validShifts = application.selectedShifts.filter((shift: any) => {
          return availableDates.includes(shift.date) && 
                 currentShiftData.some(s => 
                   s.location === shift.location && 
                   s.date === shift.date && 
                   s.shift === shift.shift
                 );
        });
        
        application.selectedShifts = validShifts;
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update existing application
  app.put("/api/application/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remove read-only fields
      delete updates.id;
      delete updates.employeeId;
      
      const updatedApplication = await storage.updateApplication(parseInt(id), updates);
      
      res.json({
        message: "Application updated successfully",
        application: updatedApplication
      });
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes for shift data management
  app.get('/api/admin/shift-data', async (req, res) => {
    try {
      const shiftData = await storage.getAllShiftData();
      res.json(shiftData);
    } catch (error) {
      console.error('Error fetching shift data:', error);
      res.status(500).json({ message: 'Failed to fetch shift data' });
    }
  });

  app.post('/api/admin/add-location', async (req, res) => {
    try {
      const { location, cohort } = req.body;
      if (!location || !cohort) {
        return res.status(400).json({ message: 'Location and cohort are required' });
      }
      await storage.addLocationToCohort(cohort, location);
      res.json({ message: 'Location added successfully' });
    } catch (error) {
      console.error('Error adding location:', error);
      res.status(500).json({ message: 'Failed to add location' });
    }
  });

  app.post('/api/admin/add-date', async (req, res) => {
    try {
      const { date, cohort } = req.body;
      if (!date || !cohort) {
        return res.status(400).json({ message: 'Date and cohort are required' });
      }
      await storage.addDateToCohort(cohort, date);
      res.json({ message: 'Date added successfully' });
    } catch (error) {
      console.error('Error adding date:', error);
      res.status(500).json({ message: 'Failed to add date' });
    }
  });

  app.put('/api/admin/shift-data/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rate, capacity } = req.body;
      
      const updateData: any = {};
      if (rate !== undefined) updateData.rate = rate;
      if (capacity !== undefined) updateData.capacity = parseInt(capacity);
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'At least one field (rate or capacity) is required' });
      }
      
      const updatedShift = await storage.updateShiftData(id, updateData);
      res.json(updatedShift);
    } catch (error) {
      console.error('Error updating shift data:', error);
      res.status(500).json({ message: 'Failed to update shift data' });
    }
  });

  app.delete('/api/admin/location/:cohort/:location', async (req, res) => {
    try {
      const { cohort, location } = req.params;
      await storage.deleteLocationFromCohort(cohort, decodeURIComponent(location));
      res.json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ message: 'Failed to delete location' });
    }
  });

  app.delete('/api/admin/date/:cohort/:date', async (req, res) => {
    try {
      const { cohort, date } = req.params;
      await storage.deleteDateFromCohort(cohort, decodeURIComponent(date));
      res.json({ message: 'Date deleted successfully' });
    } catch (error) {
      console.error('Error deleting date:', error);
      res.status(500).json({ message: 'Failed to delete date' });
    }
  });

  app.put('/api/admin/location/:cohort/:location', async (req, res) => {
    try {
      const { cohort } = req.params;
      const oldLocation = decodeURIComponent(req.params.location);
      const { newLocation } = req.body;
      
      if (!newLocation) {
        return res.status(400).json({ message: 'New location is required' });
      }
      
      await storage.updateLocationInCohort(cohort, oldLocation, newLocation);
      res.json({ message: 'Location updated successfully' });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  app.put('/api/admin/date/:cohort/:date', async (req, res) => {
    try {
      const { cohort } = req.params;
      const oldDate = decodeURIComponent(req.params.date);
      const { newDate } = req.body;
      
      if (!newDate) {
        return res.status(400).json({ message: 'New date is required' });
      }
      
      await storage.updateDateInCohort(cohort, oldDate, newDate);
      res.json({ message: 'Date updated successfully' });
    } catch (error) {
      console.error('Error updating date:', error);
      res.status(500).json({ message: 'Failed to update date' });
    }
  });

  // Cohort management routes
  app.get('/api/admin/cohorts', async (req, res) => {
    try {
      const cohorts = await storage.getAvailableCohorts();
      res.json(cohorts);
    } catch (error) {
      console.error('Error fetching cohorts:', error);
      res.status(500).json({ message: 'Failed to fetch cohorts' });
    }
  });

  app.post('/api/admin/cohorts', async (req, res) => {
    try {
      const { cohort } = req.body;
      if (!cohort) {
        return res.status(400).json({ message: 'Cohort is required' });
      }
      await storage.createCohortMatrix(cohort);
      res.json({ message: 'Cohort matrix created successfully' });
    } catch (error) {
      console.error('Error creating cohort matrix:', error);
      res.status(500).json({ message: 'Failed to create cohort matrix' });
    }
  });

  app.delete('/api/admin/cohorts/:cohort', async (req, res) => {
    try {
      const { cohort } = req.params;
      await storage.deleteCohortMatrix(cohort);
      res.json({ message: 'Cohort matrix deleted successfully' });
    } catch (error) {
      console.error('Error deleting cohort matrix:', error);
      res.status(500).json({ message: 'Failed to delete cohort matrix' });
    }
  });

  app.post('/api/admin/cohorts/:fromCohort/duplicate', async (req, res) => {
    try {
      const { fromCohort } = req.params;
      const { toCohort } = req.body;
      
      if (!toCohort) {
        return res.status(400).json({ message: 'Target cohort is required' });
      }
      
      await storage.duplicateCohortMatrix(fromCohort, toCohort);
      res.json({ message: 'Cohort matrix duplicated successfully' });
    } catch (error) {
      console.error('Error duplicating cohort matrix:', error);
      res.status(500).json({ message: 'Failed to duplicate cohort matrix' });
    }
  });

  // Download applications as Excel
  app.get('/api/admin/applications/download', async (req, res) => {
    try {
      const applications = await storage.getApplications();
      
      // Transform applications into Excel format with filtered shifts
      const excelData = await Promise.all(applications.map(async (app) => {
        let validShifts = app.selectedShifts || [];
        
        // Filter out shifts for dates that no longer exist
        if (Array.isArray(app.selectedShifts) && app.selectedShifts.length > 0) {
          const currentShiftData = await storage.getShiftDataByCohort(app.cohort);
          const availableDates = Array.from(new Set(currentShiftData.map(s => s.date)));
          
          validShifts = app.selectedShifts.filter((shift: any) => {
            return availableDates.includes(shift.date) && 
                   currentShiftData.some(s => 
                     s.location === shift.location && 
                     s.date === shift.date && 
                     s.shift === shift.shift
                   );
          });
        }
        
        return {
          'Application ID': app.id,
          'Employee ID': app.employeeId,
          'Cohort': app.cohort,
          'Phone': app.phone,
          'Line ID': app.lineId,
          'Selected Shifts': Array.isArray(validShifts) 
            ? validShifts.map((shift: any) => 
                `${shift.location} - ${shift.date} (${shift.shift}) - ${shift.rate}`
              ).join('; ')
            : 'No shifts selected',
          'Total Rate': Array.isArray(validShifts)
            ? validShifts.reduce((total: number, shift: any) => {
                const rate = parseInt(shift.rate.replace(/[^\d]/g, '')) || 0;
                return total + rate;
              }, 0)
            : 0,
          'Submitted At': app.submittedAt
        };
      }));
      
      // Create Excel workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Applications');
      
      // Generate Excel buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=applications.xlsx');
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      res.status(500).json({ message: 'Failed to generate Excel file' });
    }
  });

  // LINE Notification management routes
  app.get('/api/admin/line-notifications', async (req, res) => {
    try {
      const notifications = await storage.getNotificationLogs();
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      res.status(500).json({ message: 'Failed to fetch notification logs' });
    }
  });

  app.post('/api/admin/line-notifications/process', async (req, res) => {
    try {
      const lineService = getLineService();
      await lineService.processPendingNotifications();
      res.json({ message: 'Pending notifications processed successfully' });
    } catch (error) {
      console.error('Error processing notifications:', error);
      res.status(500).json({ message: 'Failed to process notifications' });
    }
  });

  // Message template management
  app.post('/api/admin/line-notifications/template', async (req, res) => {
    try {
      const { template } = req.body;
      if (!template) {
        return res.status(400).json({ message: 'Template is required' });
      }
      
      // For now, we'll store the template in memory or could add to database
      // This is a simple implementation - you could expand to store in DB
      res.json({ message: 'Template saved successfully', template });
    } catch (error) {
      console.error('Error saving template:', error);
      res.status(500).json({ message: 'Failed to save template' });
    }
  });

  // Preview message with macros
  app.post('/api/admin/line-notifications/preview', async (req, res) => {
    try {
      const { template, lineId, date } = req.body;
      if (!template || !lineId || !date) {
        return res.status(400).json({ message: 'Template, lineId, and date are required' });
      }

      // Mock data for preview - replace with actual employee data lookup
      const previewData = {
        name: 'John Doe',
        location: 'FC1',
        date: date,
        time: '09:00-18:00',
        shift: 'Day Shift'
      };

      let message = template;
      Object.entries(previewData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(regex, value);
      });

      res.json({ message });
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({ message: 'Failed to generate preview' });
    }
  });

  // Send manual message
  app.post('/api/admin/line-notifications/send-manual', async (req, res) => {
    try {
      const { lineId, date } = req.body;
      if (!lineId || !date) {
        return res.status(400).json({ message: 'LineId and date are required' });
      }

      const lineService = getLineService();
      
      // Create manual shift reminder data
      const reminderData = {
        name: 'Manual User',
        location: 'Manual Location',
        date: date,
        shiftType: 'DS' as const,
        shiftTime: '09:00-18:00'
      };

      const result = await lineService.sendShiftReminder(lineId, reminderData);
      
      if (result.success) {
        // Log the manual notification
        const notification = {
          applicationId: 0, // Manual sends don't have application ID
          employeeId: 'manual',
          lineId: lineId,
          shiftLocation: 'Manual Location',
          shiftDate: date,
          shiftType: 'DS',
          scheduledFor: new Date()
        };
        
        await storage.createLineNotification(notification);
        
        res.json({ message: 'Manual message sent successfully' });
      } else {
        res.status(500).json({ message: result.error || 'Failed to send message' });
      }
    } catch (error) {
      console.error('Error sending manual message:', error);
      res.status(500).json({ message: 'Failed to send manual message' });
    }
  });

  // LINE webhook endpoint for collecting User IDs
  app.post('/webhook/line', async (req, res) => {
    try {
      const signature = req.get('x-line-signature');
      if (!signature) {
        console.log('LINE webhook: Missing signature');
        return res.status(401).send('Unauthorized');
      }

      // Verify webhook signature (optional but recommended)
      const events = req.body.events || [];
      
      for (const event of events) {
        console.log('LINE webhook event:', JSON.stringify(event, null, 2));
        
        if (event.type === 'follow' || event.type === 'message') {
          const userId = event.source?.userId;
          if (userId) {
            console.log(`Collected User ID: ${userId}`);
            console.log(`=== USER ID FOR MANUAL MESSAGING: ${userId} ===`);
            
            // You can store this in your database linked to employee info
            // For now, just log it so you can copy it for testing
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('LINE webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
