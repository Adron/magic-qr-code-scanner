import { Component, OnInit } from '@angular/core';
import { LoggerService, LogLevel } from '../../services/logger.service';

@Component({
  selector: 'app-log-viewer',
  templateUrl: './log-viewer.component.html',
  styleUrls: ['./log-viewer.component.css']
})
export class LogViewerComponent implements OnInit {
  logs$ = this.logger.logs$;
  isExpanded = true;
  LogLevel = LogLevel;

  constructor(private logger: LoggerService) {}

  ngOnInit() {
    this.logger.info('Log viewer initialized');
  }

  clearLogs() {
    this.logger.clear();
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  getLogClass(level: LogLevel): string {
    return `log-${level.toLowerCase()}`;
  }
} 