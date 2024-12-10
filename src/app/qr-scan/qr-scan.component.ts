import { Component, OnDestroy } from '@angular/core';
import { Html5Qrcode } from 'html5-qrcode';
import { LoggerService } from '../services/logger.service';
import { QrHistoryService } from '../services/qr-history.service';

@Component({
  selector: 'app-qr-scan',
  templateUrl: './qr-scan.component.html',
  styleUrls: ['./qr-scan.component.css']
})
export class QrScanComponent implements OnDestroy {
  isScannerEnabled = false;
  html5QrCode: Html5Qrcode | null = null;
  statusMessage = '';
  isError = false;
  
  constructor(
    private logger: LoggerService,
    private qrHistory: QrHistoryService
  ) {}

  private updateStatus(message: string, isError = false) {
    this.logger.info('Status Update', { message, isError });
    this.statusMessage = message;
    this.isError = isError;
  }

  async startScan() {
    this.logger.debug('Starting QR scanner');
    this.updateStatus('Starting camera...');
    
    try {
      this.isScannerEnabled = true;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const readerElement = document.getElementById('reader');
      if (!readerElement) {
        throw new Error('QR Scanner element not found');
      }

      this.logger.debug('Requesting camera permissions');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.logger.debug('Camera permissions granted', {
        tracks: stream.getVideoTracks().map(track => ({
          label: track.label,
          enabled: track.enabled
        }))
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      this.html5QrCode = new Html5Qrcode("reader");

      this.logger.debug('Detecting cameras');
      const devices = await Html5Qrcode.getCameras();
      this.logger.info('Available cameras', { devices });

      if (devices && devices.length > 0) {
        const frontCamera = devices.find(device => 
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('facetime')
        ) || devices[0];

        this.logger.info('Selected camera', { camera: frontCamera });

        const config = {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          videoConstraints: {
            deviceId: frontCamera.id,
            facingMode: "user",
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
          }
        };

        this.logger.debug('Starting camera with config', { config });
        await this.html5QrCode.start(
          frontCamera.id,
          config,
          (decodedText) => {
            this.logger.info('QR Code scanned', { decodedText });
            this.updateStatus('QR Code scanned successfully!');
            this.qrHistory.addScan(decodedText);
            this.stopScanner();
            alert(`QR Code scanned: ${decodedText}`);
          },
          (error) => {
            if (!error.includes('No QR code found')) {
              this.logger.error('Scanner error', { error });
              this.updateStatus(`Scanner error: ${error}`, true);
            }
          }
        );
        this.logger.info('Camera initialized successfully');
        this.updateStatus('Camera ready! Point at a QR code to scan.');
      } else {
        throw new Error('No cameras found');
      }
    } catch (err) {
      this.logger.error('Scanner start error', { error: err });
      this.isScannerEnabled = false;
      
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.updateStatus('Camera permission denied. Please allow camera access to use the QR scanner.', true);
      } else if (err instanceof Error && err.message === 'No cameras found') {
        this.updateStatus('No cameras were found on your device.', true);
      } else {
        this.updateStatus('Failed to start the camera. Please make sure you have a working camera and try again.', true);
      }
    }
  }

  async stopScanner() {
    this.logger.debug('Stopping scanner');
    try {
      if (this.html5QrCode) {
        await this.html5QrCode.stop();
        this.html5QrCode = null;
      }
      this.isScannerEnabled = false;
      this.logger.info('Scanner stopped successfully');
      this.updateStatus('Scanner stopped.');
    } catch (err) {
      this.logger.error('Error stopping scanner', { error: err });
      this.updateStatus('Error stopping scanner.', true);
    }
  }

  ngOnDestroy() {
    this.stopScanner();
  }
} 