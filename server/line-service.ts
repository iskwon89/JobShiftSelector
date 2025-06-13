import { Client } from '@line/bot-sdk';
import { storage } from './storage';
import type { InsertLineNotification, LineNotification, ShiftSelection } from '@shared/schema';

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
}

interface ShiftReminderData {
  name: string;
  location: string;
  date: string;
  shiftType: 'DS' | 'NS';
  shiftTime: string;
}

export class LineService {
  private client: Client;
  private config: LineConfig;

  constructor(config: LineConfig) {
    this.config = config;
    this.client = new Client({
      channelAccessToken: config.channelAccessToken,
      channelSecret: config.channelSecret,
    });
  }

  private getShiftTimeText(shiftType: 'DS' | 'NS'): string {
    return shiftType === 'DS' ? '08:00 - 17:00' : '18:00 - 03:00';
  }

  private formatShiftMessage(data: ShiftReminderData): string {
    const shiftTime = this.getShiftTimeText(data.shiftType);
    const shiftName = data.shiftType === 'DS' ? 'Day Shift' : 'Night Shift';
    
    return `🔔 Shift Reminder

Hello ${data.name}!

You have a ${shiftName} tomorrow:
📍 Location: ${data.location}
📅 Date: ${data.date}
⏰ Time: ${shiftTime}

If you have any questions or need to make changes, please contact us through this LINE account or call our support team.

Good luck with your shift! 💪`;
  }

  async sendShiftReminder(
    lineId: string, 
    reminderData: ShiftReminderData
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const message = this.formatShiftMessage(reminderData);
      
      const result = await this.client.pushMessage(lineId, {
        type: 'text',
        text: message
      });

      return {
        success: true,
        response: `Message sent successfully to LINE user: ${lineId}`
      };
    } catch (error: any) {
      console.error('LINE message send error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error.response) {
        errorMessage = `LINE API Error: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data?.message) {
          errorMessage += ` (${error.response.data.message})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async scheduleNotificationsForApplication(applicationId: number): Promise<void> {
    try {
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const selectedShifts: ShiftSelection[] = Array.isArray(application.selectedShifts) 
        ? application.selectedShifts as ShiftSelection[]
        : JSON.parse(application.selectedShifts as string);

      for (const shift of selectedShifts) {
        const shiftDate = this.parseShiftDate(shift.date);
        if (!shiftDate) {
          console.warn(`Invalid date format for shift: ${shift.date}`);
          continue;
        }

        // Schedule for 9 AM the day before (Taiwan time)
        const scheduledDate = new Date(shiftDate);
        scheduledDate.setDate(scheduledDate.getDate() - 1);
        scheduledDate.setHours(9, 0, 0, 0);

        // Convert to UTC for storage
        const scheduledDateUTC = new Date(scheduledDate.getTime() - (8 * 60 * 60 * 1000));

        const notification: InsertLineNotification = {
          applicationId,
          employeeId: application.employeeId,
          lineId: application.lineId,
          shiftLocation: shift.location,
          shiftDate: shift.date,
          shiftType: shift.shift,
          scheduledFor: scheduledDateUTC,
        };

        await storage.createLineNotification(notification);
      }
    } catch (error) {
      console.error('Error scheduling notifications for application:', error);
      throw error;
    }
  }

  private parseShiftDate(dateStr: string): Date | null {
    try {
      const currentYear = new Date().getFullYear();
      
      // Handle "13-Jun" format
      if (dateStr.includes('-')) {
        const [day, monthAbbr] = dateStr.split('-');
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        const monthIndex = monthMap[monthAbbr];
        if (monthIndex !== undefined) {
          return new Date(currentYear, monthIndex, parseInt(day));
        }
      }
      
      // Handle "Mon, Jun 16" format
      if (dateStr.includes(', ')) {
        const parts = dateStr.split(', ');
        if (parts.length === 2) {
          const [, monthDay] = parts;
          const monthDayParts = monthDay.split(' ');
          if (monthDayParts.length === 2) {
            const [month, day] = monthDayParts;
            
            const monthMap: { [key: string]: number } = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            
            const monthIndex = monthMap[month];
            if (monthIndex !== undefined) {
              return new Date(currentYear, monthIndex, parseInt(day));
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async processPendingNotifications(): Promise<void> {
    try {
      const now = new Date();
      const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      // Only run between 9:00 and 9:30 AM Taiwan time
      const hour = taiwanTime.getHours();
      const minute = taiwanTime.getMinutes();
      
      if (hour !== 9 || minute >= 30) {
        return;
      }

      const pendingNotifications = await storage.getPendingNotifications();
      
      for (const notification of pendingNotifications) {
        const scheduledTime = new Date(notification.scheduledFor);
        
        // Check if it's time to send this notification
        if (now >= scheduledTime) {
          await this.sendNotificationAndUpdateStatus(notification);
        }
      }
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  private async sendNotificationAndUpdateStatus(notification: LineNotification): Promise<void> {
    try {
      const application = await storage.getApplicationById(notification.applicationId);
      if (!application) {
        throw new Error(`Application ${notification.applicationId} not found`);
      }

      const reminderData: ShiftReminderData = {
        name: application.name,
        location: notification.shiftLocation,
        date: notification.shiftDate,
        shiftType: notification.shiftType as 'DS' | 'NS',
        shiftTime: this.getShiftTimeText(notification.shiftType as 'DS' | 'NS'),
      };

      const result = await this.sendShiftReminder(notification.lineId, reminderData);
      
      if (result.success) {
        await storage.updateNotificationStatus(notification.id, 'sent', result.response);
        console.log(`Notification sent successfully to ${notification.lineId} for shift ${notification.shiftLocation} on ${notification.shiftDate}`);
      } else {
        await storage.updateNotificationStatus(notification.id, 'failed', result.error);
        console.error(`Failed to send notification to ${notification.lineId}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error sending notification ${notification.id}:`, error);
      await storage.updateNotificationStatus(notification.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Create singleton instance
let lineService: LineService | null = null;

export function getLineService(): LineService {
  if (!lineService) {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    
    if (!channelAccessToken || !channelSecret) {
      throw new Error('LINE credentials not configured. Please set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET environment variables.');
    }
    
    lineService = new LineService({
      channelAccessToken,
      channelSecret,
    });
  }
  
  return lineService;
}