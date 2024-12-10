import { Component, OnDestroy } from '@angular/core';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.component.html',
  styleUrls: ['./qr-scan.component.css']
})
export class QrScanComponent implements OnDestroy {
  isScannerEnabled = false;
  html5QrCode: Html5Qrcode | null = null;

  startScan() {
    this.isScannerEnabled = true;
    this.html5QrCode = new Html5Qrcode("reader");
    
    this.html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        console.log('Scanned Successfully:', decodedText);
        this.stopScanner();
        alert(`QR Code scanned: ${decodedText}`);
      },
      (error) => {
        // console.error('Scan Error:', error);
      }
    ).catch((err) => {
      console.error('Start Error:', err);
    });
  }

  stopScanner() {
    if (this.html5QrCode) {
      this.html5QrCode.stop().then(() => {
        this.isScannerEnabled = false;
      }).catch((err) => {
        console.error('Stop Error:', err);
      });
    }
  }

  ngOnDestroy() {
    this.stopScanner();
  }
} 