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

      // For now, everyone is eligible for Cohort A
      res.json({
        id: employeeId.trim().toUpperCase(),
        name: `Employee ${employeeId.trim().toUpperCase()}`,
        eligible: true,
        cohort: 'A'
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
          return insertEmployeeSchema.parse({
            employeeId: String(row.ID || row.id || '').trim(),
            name: String(row.Name || row.name || '').trim(),
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
      const { location } = req.body;
      if (!location) {
        return res.status(400).json({ message: 'Location is required' });
      }
      await storage.addLocation(location);
      res.json({ message: 'Location added successfully' });
    } catch (error) {
      console.error('Error adding location:', error);
      res.status(500).json({ message: 'Failed to add location' });
    }
  });

  app.post('/api/admin/add-date', async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) {
        return res.status(400).json({ message: 'Date is required' });
      }
      await storage.addDate(date);
      res.json({ message: 'Date added successfully' });
    } catch (error) {
      console.error('Error adding date:', error);
      res.status(500).json({ message: 'Failed to add date' });
    }
  });

  app.put('/api/admin/shift-data/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { rate } = req.body;
      
      if (!rate) {
        return res.status(400).json({ message: 'Rate is required' });
      }
      
      const updatedShift = await storage.updateShiftData(id, { rate });
      res.json(updatedShift);
    } catch (error) {
      console.error('Error updating shift rate:', error);
      res.status(500).json({ message: 'Failed to update shift rate' });
    }
  });

  app.delete('/api/admin/location/:location', async (req, res) => {
    try {
      const { location } = req.params;
      await storage.deleteLocation(decodeURIComponent(location));
      res.json({ message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ message: 'Failed to delete location' });
    }
  });

  app.delete('/api/admin/date/:date', async (req, res) => {
    try {
      const { date } = req.params;
      await storage.deleteDate(decodeURIComponent(date));
      res.json({ message: 'Date deleted successfully' });
    } catch (error) {
      console.error('Error deleting date:', error);
      res.status(500).json({ message: 'Failed to delete date' });
    }
  });

  app.put('/api/admin/location/:location', async (req, res) => {
    try {
      const oldLocation = decodeURIComponent(req.params.location);
      const { newLocation } = req.body;
      
      if (!newLocation) {
        return res.status(400).json({ message: 'New location is required' });
      }
      
      await storage.updateLocation(oldLocation, newLocation);
      res.json({ message: 'Location updated successfully' });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  app.put('/api/admin/date/:date', async (req, res) => {
    try {
      const oldDate = decodeURIComponent(req.params.date);
      const { newDate } = req.body;
      
      if (!newDate) {
        return res.status(400).json({ message: 'New date is required' });
      }
      
      await storage.updateDate(oldDate, newDate);
      res.json({ message: 'Date updated successfully' });
    } catch (error) {
      console.error('Error updating date:', error);
      res.status(500).json({ message: 'Failed to update date' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
