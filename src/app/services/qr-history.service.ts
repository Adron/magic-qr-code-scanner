import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface QRCodeEntry {
  timestamp: Date;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class QrHistoryService {
  private history = new BehaviorSubject<QRCodeEntry[]>([]);
  history$ = this.history.asObservable();

  addScan(content: string) {
    const entry: QRCodeEntry = {
      timestamp: new Date(),
      content
    };
    const currentHistory = this.history.getValue();
    this.history.next([entry, ...currentHistory].slice(0, 50)); // Keep last 50 scans
  }

  clear() {
    this.history.next([]);
  }
} 