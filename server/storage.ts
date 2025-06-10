import { employees, applications, shiftData, type Employee, type InsertEmployee, type Application, type InsertApplication, type ShiftData } from "@shared/schema";

export interface IStorage {
  // Employee management
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  bulkCreateEmployees(employees: InsertEmployee[]): Promise<Employee[]>;
  clearEmployees(): Promise<void>;

  // Application management
  createApplication(application: InsertApplication): Promise<Application>;
  getApplications(): Promise<Application[]>;

  // Shift data management
  getShiftDataByCohort(cohort: string): Promise<ShiftData[]>;
  getAllShiftData(): Promise<ShiftData[]>;
  createShiftData(shiftData: Omit<ShiftData, 'id'>): Promise<ShiftData>;
  updateShiftData(id: number, updates: Partial<ShiftData>): Promise<ShiftData>;
  bulkCreateShiftData(shiftDataList: Omit<ShiftData, 'id'>[]): Promise<ShiftData[]>;
  addLocation(location: string): Promise<void>;
  addDate(date: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private employees: Map<number, Employee>;
  private applications: Map<number, Application>;
  private shiftData: Map<number, ShiftData>;
  private currentEmployeeId: number;
  private currentApplicationId: number;
  private currentShiftDataId: number;

  constructor() {
    this.employees = new Map();
    this.applications = new Map();
    this.shiftData = new Map();
    this.currentEmployeeId = 1;
    this.currentApplicationId = 1;
    this.currentShiftDataId = 1;
    
    // Initialize with default shift data
    this.initializeShiftData();
  }

  private initializeShiftData() {
    const locations = ['FC1', 'FC2', 'FC3', 'FC4', 'FC5'];
    const dates = ['10-Jun', '11-Jun', '12-Jun'];
    const shifts = ['DS', 'SS'];
    
    // Cohort A rates
    const cohortARates = {
      'DS': '1x',
      'SS': '1.5x'
    };
    
    // Cohort B rates (higher rates)
    const cohortBRates = {
      'DS': '1x',
      'SS': '2x'
    };

    // Create shift data for both cohorts
    ['A', 'B'].forEach(cohort => {
      const rates = cohort === 'A' ? cohortARates : cohortBRates;
      
      locations.forEach(location => {
        dates.forEach(date => {
          shifts.forEach(shift => {
            // Special cases for higher rates at certain locations
            let rate = rates[shift as keyof typeof rates];
            if (cohort === 'B' && location === 'FC2' && shift === 'SS') {
              rate = '2x';
            }
            if (cohort === 'A' && location === 'FC4' && shift === 'SS') {
              rate = '2x';
            }
            
            const id = this.currentShiftDataId++;
            this.shiftData.set(id, {
              id,
              cohort,
              location,
              date,
              shift,
              rate
            });
          });
        });
      });
    });
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = this.currentEmployeeId++;
    const employee: Employee = { 
      ...insertEmployee, 
      id,
      cohort: insertEmployee.cohort || null
    };
    this.employees.set(id, employee);
    return employee;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (employee) => employee.employeeId === employeeId,
    );
  }

  async bulkCreateEmployees(insertEmployees: InsertEmployee[]): Promise<Employee[]> {
    const employees: Employee[] = [];
    for (const insertEmployee of insertEmployees) {
      const employee = await this.createEmployee(insertEmployee);
      employees.push(employee);
    }
    return employees;
  }

  async clearEmployees(): Promise<void> {
    this.employees.clear();
    this.currentEmployeeId = 1;
  }

  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const id = this.currentApplicationId++;
    const application: Application = { 
      ...insertApplication, 
      id,
      submittedAt: new Date().toISOString()
    };
    this.applications.set(id, application);
    return application;
  }

  async getApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  async getShiftDataByCohort(cohort: string): Promise<ShiftData[]> {
    return Array.from(this.shiftData.values()).filter(
      (shift) => shift.cohort === cohort,
    );
  }

  async createShiftData(insertShiftData: Omit<ShiftData, 'id'>): Promise<ShiftData> {
    const id = this.currentShiftDataId++;
    const shiftData: ShiftData = { ...insertShiftData, id };
    this.shiftData.set(id, shiftData);
    return shiftData;
  }

  async getAllShiftData(): Promise<ShiftData[]> {
    return Array.from(this.shiftData.values());
  }

  async updateShiftData(id: number, updates: Partial<ShiftData>): Promise<ShiftData> {
    const existing = this.shiftData.get(id);
    if (!existing) {
      throw new Error(`Shift data with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.shiftData.set(id, updated);
    return updated;
  }

  async addLocation(location: string): Promise<void> {
    const dates = ['10-Jun', '11-Jun', '12-Jun'];
    const shifts = ['DS', 'SS'];
    const cohorts = ['A', 'B'];
    
    for (const cohort of cohorts) {
      for (const date of dates) {
        for (const shift of shifts) {
          // Default rates
          let rate = '1x';
          if (shift === 'SS') {
            rate = cohort === 'A' ? '1.5x' : '2x';
          }
          
          const id = this.currentShiftDataId++;
          this.shiftData.set(id, {
            id,
            cohort,
            location,
            date,
            shift,
            rate
          });
        }
      }
    }
  }

  async addDate(date: string): Promise<void> {
    const locations = ['FC1', 'FC2', 'FC3', 'FC4', 'FC5'];
    const shifts = ['DS', 'SS'];
    const cohorts = ['A', 'B'];
    
    for (const cohort of cohorts) {
      for (const location of locations) {
        for (const shift of shifts) {
          // Default rates
          let rate = '1x';
          if (shift === 'SS') {
            rate = cohort === 'A' ? '1.5x' : '2x';
          }
          
          const id = this.currentShiftDataId++;
          this.shiftData.set(id, {
            id,
            cohort,
            location,
            date,
            shift,
            rate
          });
        }
      }
    }
  }

  async bulkCreateShiftData(shiftDataList: Omit<ShiftData, 'id'>[]): Promise<ShiftData[]> {
    const results: ShiftData[] = [];
    for (const insertShiftData of shiftDataList) {
      const shiftData = await this.createShiftData(insertShiftData);
      results.push(shiftData);
    }
    return results;
  }
}

export const storage = new MemStorage();
