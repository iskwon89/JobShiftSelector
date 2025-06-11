import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmployeeSchema, insertApplicationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Verify employee ID and get user data
  app.post("/api/verify-employee", async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      // Check against uploaded employee data
      const employee = await storage.getEmployeeByEmployeeId(employeeId.trim().toUpperCase());
      
      if (!employee) {
        return res.status(404).json({ 
          message: "Employee ID not found. Please check your ID or contact HR." 
        });
      }

      if (!employee.eligible) {
        return res.status(403).json({ 
          message: "You are not eligible for shift applications. Please contact HR for more information." 
        });
      }

      // Return employee data with cohort for pricing matrix
      res.json({
        id: employee.employeeId,
        name: employee.name,
        eligible: employee.eligible,
        cohort: employee.cohort || "A"
      });
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

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Clear existing employees
      await storage.clearEmployees();

      // Validate and insert employees
      const employees = data.map((row: any) => {
        try {
          const employeeId = String(row.ID || row.id || '').trim().toUpperCase();
          const name = String(row.Name || row.name || '').trim();
          
          if (!employeeId || !name) {
            return null;
          }
          
          return insertEmployeeSchema.parse({
            employeeId,
            name,
            eligible: Boolean(row.Eligible === true || row.Eligible === 'TRUE' || row.Eligible === 'true' || row.eligible === true),
            cohort: row.Cohort || row.cohort || null
          });
        } catch (error) {
          console.error("Invalid row data:", row, error);
          return null;
        }
      }).filter((emp): emp is NonNullable<typeof emp> => emp !== null);

      if (employees.length === 0) {
        return res.status(400).json({ message: "No valid employee data found in Excel file" });
      }

      await storage.bulkCreateEmployees(employees);

      res.json({ 
        message: "Excel file processed successfully", 
        employeesLoaded: employees.length 
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

  // Get all applications (for admin)
  app.get("/api/applications", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      res.json(applications);
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
      if (capacity !== undefined) updateData.capacity = capacity;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
