import { Component } from '@angular/core';
import { QrHistoryService } from '../../services/qr-history.service';

@Component({
  selector: 'app-qr-history',
  templateUrl: './qr-history.component.html',
  styleUrls: ['./qr-history.component.css']
})
export class QrHistoryComponent {
  history$ = this.qrHistory.history$;
  isExpanded = true;

  constructor(private qrHistory: QrHistoryService) {}

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  clearHistory() {
    this.qrHistory.clear();
  }
} 