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

      const employee = await storage.getEmployeeByEmployeeId(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee ID not found" });
      }

      if (!employee.eligible) {
        return res.status(403).json({ message: "Employee is not eligible for this application" });
      }

      res.json({
        id: employee.employeeId,
        name: employee.name,
        eligible: employee.eligible,
        cohort: employee.cohort
      });
    } catch (error) {
      console.error("Error verifying employee:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload and process Excel file
  app.post("/api/upload-excel", upload.single('file'), async (req, res) => {
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
      }).filter(Boolean);

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

  const httpServer = createServer(app);
  return httpServer;
}
