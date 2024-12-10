import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logs = new BehaviorSubject<LogEntry[]>([]);
  logs$ = this.logs.asObservable();
  
  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data
    };
    
    const currentLogs = this.logs.getValue();
    this.logs.next([entry, ...currentLogs].slice(0, 100)); // Keep last 100 logs
    console.log(`[${level}] ${message}`, data || '');
  }

  debug(message: string, data?: any) {
    this.addLog(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.addLog(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.addLog(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any) {
    this.addLog(LogLevel.ERROR, message, data);
  }

  clear() {
    this.logs.next([]);
  }
} 