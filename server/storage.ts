import { employees, applications, shiftData, type Employee, type InsertEmployee, type Application, type InsertApplication, type ShiftData } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

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
  updateShiftCapacity(id: number, capacity: number): Promise<ShiftData>;
  incrementShiftBookings(cohort: string, location: string, date: string, shift: string): Promise<void>;
  addLocationToCohort(cohort: string, location: string): Promise<void>;
  addDateToCohort(cohort: string, date: string): Promise<void>;
  deleteLocationFromCohort(cohort: string, location: string): Promise<void>;
  deleteDateFromCohort(cohort: string, date: string): Promise<void>;
  updateLocationInCohort(cohort: string, oldLocation: string, newLocation: string): Promise<void>;
  updateDateInCohort(cohort: string, oldDate: string, newDate: string): Promise<void>;
  
  // Cohort management
  getAvailableCohorts(): Promise<string[]>;
  createCohortMatrix(cohort: string): Promise<void>;
  deleteCohortMatrix(cohort: string): Promise<void>;
  duplicateCohortMatrix(fromCohort: string, toCohort: string): Promise<void>;
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
    
    // Cohort A rates (in NTD)
    const cohortARates = {
      'DS': '800',
      'SS': '1200'
    };
    
    // Cohort B rates (higher rates in NTD)
    const cohortBRates = {
      'DS': '900',
      'SS': '1600'
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
              rate = '1800';
            }
            if (cohort === 'A' && location === 'FC4' && shift === 'SS') {
              rate = '1600';
            }
            
            const id = this.currentShiftDataId++;
            this.shiftData.set(id, {
              id,
              cohort,
              location,
              date,
              shift,
              rate,
              capacity: 10, // Default capacity
              currentBookings: 0 // Start with no bookings
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
    
    // Update booking counts for each selected shift
    if (insertApplication.selectedShifts) {
      const shifts = JSON.parse(JSON.stringify(insertApplication.selectedShifts));
      if (Array.isArray(shifts)) {
        for (const shift of shifts) {
          if (shift && shift.location && shift.date && shift.shift) {
            await this.incrementShiftBookings(insertApplication.cohort, shift.location, shift.date, shift.shift);
          }
        }
      }
    }
    
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

  async updateShiftCapacity(id: number, capacity: number): Promise<ShiftData> {
    return this.updateShiftData(id, { capacity });
  }

  async incrementShiftBookings(cohort: string, location: string, date: string, shift: string): Promise<void> {
    const shiftEntry = Array.from(this.shiftData.values()).find(
      s => s.cohort === cohort && s.location === location && s.date === date && s.shift === shift
    );
    
    if (shiftEntry) {
      shiftEntry.currentBookings = (shiftEntry.currentBookings || 0) + 1;
      this.shiftData.set(shiftEntry.id, shiftEntry);
    }
  }

  async addLocationToCohort(cohort: string, location: string): Promise<void> {
    const dates = Array.from(new Set(
      Array.from(this.shiftData.values())
        .filter(s => s.cohort === cohort)
        .map(s => s.date)
    ));
    
    const shifts = ['DS', 'SS'];
    
    for (const date of dates) {
      for (const shift of shifts) {
        // Default rates based on cohort and shift (in NTD)
        let rate = '800';
        if (shift === 'SS') {
          rate = cohort === 'A' ? '1200' : '1600';
        } else if (cohort === 'B') {
          rate = '900';
        }
        
        const id = this.currentShiftDataId++;
        this.shiftData.set(id, {
          id,
          cohort,
          location,
          date,
          shift,
          rate,
          capacity: 10,
          currentBookings: 0
        });
      }
    }
  }

  async addDateToCohort(cohort: string, date: string): Promise<void> {
    const locations = Array.from(new Set(
      Array.from(this.shiftData.values())
        .filter(s => s.cohort === cohort)
        .map(s => s.location)
    ));
    
    const shifts = ['DS', 'SS'];
    
    for (const location of locations) {
      for (const shift of shifts) {
        // Default rates based on cohort and shift (in NTD)
        let rate = '800';
        if (shift === 'SS') {
          rate = cohort === 'A' ? '1200' : '1600';
        } else if (cohort === 'B') {
          rate = '900';
        }
        
        const id = this.currentShiftDataId++;
        this.shiftData.set(id, {
          id,
          cohort,
          location,
          date,
          shift,
          rate,
          capacity: 10,
          currentBookings: 0
        });
      }
    }
  }

  async deleteLocationFromCohort(cohort: string, location: string): Promise<void> {
    const toDelete = Array.from(this.shiftData.values())
      .filter(shift => shift.location === location && shift.cohort === cohort);
    
    for (const shift of toDelete) {
      this.shiftData.delete(shift.id);
    }
  }

  async deleteDateFromCohort(cohort: string, date: string): Promise<void> {
    const toDelete = Array.from(this.shiftData.values())
      .filter(shift => shift.date === date && shift.cohort === cohort);
    
    for (const shift of toDelete) {
      this.shiftData.delete(shift.id);
    }
  }

  async updateLocationInCohort(cohort: string, oldLocation: string, newLocation: string): Promise<void> {
    const toUpdate = Array.from(this.shiftData.values())
      .filter(shift => shift.location === oldLocation && shift.cohort === cohort);
    
    for (const shift of toUpdate) {
      this.shiftData.set(shift.id, { ...shift, location: newLocation });
    }
  }

  async updateDateInCohort(cohort: string, oldDate: string, newDate: string): Promise<void> {
    const toUpdate = Array.from(this.shiftData.values())
      .filter(shift => shift.date === oldDate && shift.cohort === cohort);
    
    for (const shift of toUpdate) {
      this.shiftData.set(shift.id, { ...shift, date: newDate });
    }
  }

  async getAvailableCohorts(): Promise<string[]> {
    const cohorts = Array.from(new Set(
      Array.from(this.shiftData.values()).map(s => s.cohort)
    ));
    return cohorts.sort();
  }

  async createCohortMatrix(cohort: string): Promise<void> {
    // Create a basic matrix with default locations and dates
    const defaultLocations = ['FC1', 'FC2', 'FC3', 'FC4', 'FC5'];
    const defaultDates = ['10-Jun', '11-Jun', '12-Jun'];
    const shifts = ['DS', 'SS'];
    
    for (const location of defaultLocations) {
      for (const date of defaultDates) {
        for (const shift of shifts) {
          // Default rates based on cohort and shift (in NTD)
          let rate = '800';
          if (shift === 'SS') {
            rate = cohort === 'A' ? '1200' : '1600';
          } else if (cohort === 'B') {
            rate = '900';
          }
          
          const id = this.currentShiftDataId++;
          this.shiftData.set(id, {
            id,
            cohort,
            location,
            date,
            shift,
            rate,
            capacity: 10,
            currentBookings: 0
          });
        }
      }
    }
  }

  async deleteCohortMatrix(cohort: string): Promise<void> {
    const toDelete = Array.from(this.shiftData.values())
      .filter(shift => shift.cohort === cohort);
    
    for (const shift of toDelete) {
      this.shiftData.delete(shift.id);
    }
  }

  async duplicateCohortMatrix(fromCohort: string, toCohort: string): Promise<void> {
    const sourceData = Array.from(this.shiftData.values())
      .filter(shift => shift.cohort === fromCohort);
    
    for (const shift of sourceData) {
      const id = this.currentShiftDataId++;
      this.shiftData.set(id, {
        ...shift,
        id,
        cohort: toCohort
      });
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

export class DatabaseStorage implements IStorage {
  // Employee management
  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));
    return employee;
  }

  async bulkCreateEmployees(insertEmployees: InsertEmployee[]): Promise<Employee[]> {
    if (insertEmployees.length === 0) return [];
    
    const createdEmployees = await db
      .insert(employees)
      .values(insertEmployees)
      .onConflictDoUpdate({
        target: employees.employeeId,
        set: {
          name: sql`excluded.name`,
          eligible: sql`excluded.eligible`,
          cohort: sql`excluded.cohort`,
        },
      })
      .returning();
    return createdEmployees;
  }

  async clearEmployees(): Promise<void> {
    await db.delete(employees);
  }

  // Application management
  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const applicationData = {
      ...insertApplication,
      submittedAt: new Date().toISOString(),
    };
    
    const [application] = await db
      .insert(applications)
      .values(applicationData)
      .returning();
    return application;
  }

  async getApplications(): Promise<Application[]> {
    return await db.select().from(applications);
  }

  // Shift data management
  async getShiftDataByCohort(cohort: string): Promise<ShiftData[]> {
    return await db
      .select()
      .from(shiftData)
      .where(eq(shiftData.cohort, cohort));
  }

  async getAllShiftData(): Promise<ShiftData[]> {
    return await db.select().from(shiftData);
  }

  async createShiftData(insertShiftData: Omit<ShiftData, 'id'>): Promise<ShiftData> {
    const [created] = await db
      .insert(shiftData)
      .values(insertShiftData)
      .returning();
    return created;
  }

  async updateShiftData(id: number, updates: Partial<ShiftData>): Promise<ShiftData> {
    const [updated] = await db
      .update(shiftData)
      .set(updates)
      .where(eq(shiftData.id, id))
      .returning();
    return updated;
  }

  async bulkCreateShiftData(shiftDataList: Omit<ShiftData, 'id'>[]): Promise<ShiftData[]> {
    if (shiftDataList.length === 0) return [];
    
    const created = await db
      .insert(shiftData)
      .values(shiftDataList)
      .onConflictDoUpdate({
        target: [shiftData.cohort, shiftData.location, shiftData.date, shiftData.shift],
        set: {
          rate: sql`excluded.rate`,
          capacity: sql`excluded.capacity`,
          currentBookings: sql`excluded.current_bookings`,
        },
      })
      .returning();
    return created;
  }

  async updateShiftCapacity(id: number, capacity: number): Promise<ShiftData> {
    const [updated] = await db
      .update(shiftData)
      .set({ capacity })
      .where(eq(shiftData.id, id))
      .returning();
    return updated;
  }

  async incrementShiftBookings(cohort: string, location: string, date: string, shift: string): Promise<void> {
    await db
      .update(shiftData)
      .set({ 
        currentBookings: sql`${shiftData.currentBookings} + 1`
      })
      .where(
        and(
          eq(shiftData.cohort, cohort),
          eq(shiftData.location, location),
          eq(shiftData.date, date),
          eq(shiftData.shift, shift)
        )
      );
  }

  async addLocationToCohort(cohort: string, location: string): Promise<void> {
    // Get existing dates and shifts for this cohort
    const existingData = await db
      .select()
      .from(shiftData)
      .where(eq(shiftData.cohort, cohort));

    if (existingData.length === 0) return;

    // Get unique dates and shifts
    const dates = Array.from(new Set(existingData.map(d => d.date)));
    const shifts = ['DS', 'SS'];

    // Create entries for new location
    const newEntries = dates.flatMap(date =>
      shifts.map(shift => ({
        cohort,
        location,
        date,
        shift,
        rate: cohort === 'A' ? (shift === 'DS' ? '800' : '1200') : (shift === 'DS' ? '900' : '1600'),
        capacity: 10,
        currentBookings: 0,
      }))
    );

    if (newEntries.length > 0) {
      await db.insert(shiftData).values(newEntries);
    }
  }

  async addDateToCohort(cohort: string, date: string): Promise<void> {
    // Get existing locations for this cohort
    const existingData = await db
      .select()
      .from(shiftData)
      .where(eq(shiftData.cohort, cohort));

    if (existingData.length === 0) return;

    // Get unique locations
    const locations = Array.from(new Set(existingData.map(d => d.location)));
    const shifts = ['DS', 'SS'];

    // Create entries for new date
    const newEntries = locations.flatMap(location =>
      shifts.map(shift => ({
        cohort,
        location,
        date,
        shift,
        rate: cohort === 'A' ? (shift === 'DS' ? '800' : '1200') : (shift === 'DS' ? '900' : '1600'),
        capacity: 10,
        currentBookings: 0,
      }))
    );

    if (newEntries.length > 0) {
      await db.insert(shiftData).values(newEntries);
    }
  }

  async deleteLocationFromCohort(cohort: string, location: string): Promise<void> {
    await db
      .delete(shiftData)
      .where(
        and(
          eq(shiftData.cohort, cohort),
          eq(shiftData.location, location)
        )
      );
  }

  async deleteDateFromCohort(cohort: string, date: string): Promise<void> {
    await db
      .delete(shiftData)
      .where(
        and(
          eq(shiftData.cohort, cohort),
          eq(shiftData.date, date)
        )
      );
  }

  async updateLocationInCohort(cohort: string, oldLocation: string, newLocation: string): Promise<void> {
    await db
      .update(shiftData)
      .set({ location: newLocation })
      .where(
        and(
          eq(shiftData.cohort, cohort),
          eq(shiftData.location, oldLocation)
        )
      );
  }

  async updateDateInCohort(cohort: string, oldDate: string, newDate: string): Promise<void> {
    await db
      .update(shiftData)
      .set({ date: newDate })
      .where(
        and(
          eq(shiftData.cohort, cohort),
          eq(shiftData.date, oldDate)
        )
      );
  }

  async getAvailableCohorts(): Promise<string[]> {
    const result = await db
      .selectDistinct({ cohort: shiftData.cohort })
      .from(shiftData);
    return result.map(r => r.cohort);
  }

  async createCohortMatrix(cohort: string): Promise<void> {
    const defaultLocations = ['FC1', 'FC2', 'FC3'];
    const defaultDates = ['11-Jun', '12-Jun', '13-Jun', '14-Jun', '15-Jun'];
    const shifts = ['DS', 'SS'];

    const entries = defaultLocations.flatMap(location =>
      defaultDates.flatMap(date =>
        shifts.map(shift => ({
          cohort,
          location,
          date,
          shift,
          rate: cohort === 'A' ? (shift === 'DS' ? '800' : '1200') : (shift === 'DS' ? '900' : '1600'),
          capacity: 10,
          currentBookings: 0,
        }))
      )
    );

    await db.insert(shiftData).values(entries);
  }

  async deleteCohortMatrix(cohort: string): Promise<void> {
    await db.delete(shiftData).where(eq(shiftData.cohort, cohort));
  }

  async duplicateCohortMatrix(fromCohort: string, toCohort: string): Promise<void> {
    const sourceData = await db
      .select()
      .from(shiftData)
      .where(eq(shiftData.cohort, fromCohort));

    if (sourceData.length === 0) return;

    const duplicatedData = sourceData.map(data => ({
      cohort: toCohort,
      location: data.location,
      date: data.date,
      shift: data.shift,
      rate: data.rate,
      capacity: data.capacity,
      currentBookings: 0, // Reset bookings for new cohort
    }));

    await db.insert(shiftData).values(duplicatedData);
  }
}

export const storage = new DatabaseStorage();
