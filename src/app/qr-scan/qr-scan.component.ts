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
  isZoomedMode = false;
  private activeStream: MediaStream | null = null;
  private lastErrorTime = 0;
  private readonly ERROR_SUPPRESSION_DURATION = 300000; // 5 minutes in milliseconds
  private readonly DUPLICATE_CHECK_DURATION = 60000; // 1 minute
  private recentScans = new Map<string, number>();
  private isIpad9: boolean;

  // Common error messages to suppress
  private readonly SUPPRESSED_ERRORS = [
    'No QR code found',
    'No barcode or QR code detected',
    'QR code parse error'
  ];
  
  constructor(
    private logger: LoggerService,
    private qrHistory: QrHistoryService
  ) {
    // Check specifically for iPad 9
    this.isIpad9 = /iPad/.test(navigator.userAgent) && 
                   (/CPU OS 15/.test(navigator.userAgent) || /CPU OS 16/.test(navigator.userAgent));
    if (this.isIpad9) {
      this.logger.info('iPad 9 detected, using optimized settings');
    }
  }

  private updateStatus(message: string, isError = false, duration = 3000) {
    this.logger.info('Status Update', { message, isError });
    this.statusMessage = message;
    this.isError = isError;
    
    if (!isError && duration > 0) {
      setTimeout(() => {
        if (this.statusMessage === message) {
          this.statusMessage = '';
        }
      }, duration);
    }
  }

  async onScanModeChange(mode: string) {
    this.isZoomedMode = mode === 'zoomed';
    if (!this.activeStream) return;

    try {
      const videoTrack = this.activeStream.getVideoTracks()[0];
      
      if (this.isZoomedMode) {
        // Distance mode - iPad 9 front camera is 1.2MP (roughly 1280x960)
        await videoTrack.applyConstraints({
          width: { ideal: 1280 },
          height: { ideal: 960 },
          frameRate: { ideal: 15 } // Lower frame rate for better exposure
        });
        this.logger.info('Switched to distance mode');
        this.updateStatus('Switched to distance mode (12+ inches)', false, 3000);
      } else {
        // Standard mode - slightly lower resolution for faster processing
        await videoTrack.applyConstraints({
          width: { ideal: 1024 },
          height: { ideal: 768 },
          frameRate: { ideal: 30 }
        });
        this.logger.info('Switched to standard mode');
        this.updateStatus('Switched to standard mode (4-8 inches)', false, 3000);
      }
    } catch (error) {
      this.logger.error('Failed to update camera settings', { error });
      this.updateStatus('Continuing with current settings', true);
    }
  }

  private async initializeCamera(deviceId: string): Promise<MediaStream> {
    // iPad 9 front camera optimized settings
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId,
        width: { min: 1024, ideal: this.isZoomedMode ? 1280 : 1024, max: 1280 },
        height: { min: 768, ideal: this.isZoomedMode ? 960 : 768, max: 960 },
        frameRate: { 
          min: 15, 
          ideal: this.isZoomedMode ? 15 : 30,
          max: 30 
        },
        facingMode: "user" // Always use front camera
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;

      // Log actual settings for debugging
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      this.logger.info('Active camera settings:', settings);

      return stream;
    } catch (error) {
      this.logger.warn('Failed with optimal settings, trying fallback settings', { error });
      
      // Fallback to minimum viable settings
      const fallbackConstraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId,
          facingMode: "user"
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      this.activeStream = stream;
      return stream;
    }
  }

  async startScan() {
    this.logger.debug('Starting QR scanner');
    this.updateStatus('Starting camera...', false, 0);
    
    try {
      this.isScannerEnabled = true;
      
      const readerElement = document.getElementById('reader');
      if (!readerElement) {
        throw new Error('QR Scanner element not found');
      }

      this.logger.debug('Detecting cameras');
      const devices = await Html5Qrcode.getCameras();
      this.logger.info('Available cameras', { devices });

      if (devices && devices.length > 0) {
        // For iPad 9, prefer front camera
        const frontCamera = devices.find(device => 
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('facetime') ||
          device.label.toLowerCase().includes('user')
        ) || devices[0];

        this.logger.info('Selected camera', { camera: frontCamera });
        await this.initializeCamera(frontCamera.id);
        this.html5QrCode = new Html5Qrcode("reader");

        const config = {
          fps: this.isZoomedMode ? 15 : 30,
          qrbox: { width: 250, height: 250 }, // Optimized for iPad 9 resolution
          formatsToSupport: ['QR_CODE'],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        this.logger.debug('Starting camera with config', { config });
        await this.html5QrCode.start(
          frontCamera.id,
          config,
          (decodedText) => {
            this.logger.info('QR Code scanned', { decodedText });
            
            if (this.isRecentlyScanned(decodedText)) {
              this.updateStatus(`ID already scanned, ID is: ${decodedText}`, false, 5000);
              this.logger.info('Duplicate scan detected', { decodedText });
            } else {
              requestAnimationFrame(() => {
                this.qrHistory.addScan(decodedText);
                this.updateStatus(`Scanned: ${decodedText}`, false, 5000);
              });
            }
          },
          (error) => {
            if (!this.shouldSuppressError(error)) {
              this.logger.error('Scanner error', { error });
              this.updateStatus(`Scanner error: ${error}`, true);
            }
          }
        );
        this.logger.info('Camera initialized successfully');
        this.updateStatus('Camera ready! Point at a QR code to scan.', false, 0);
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

  private shouldSuppressError(error: string): boolean {
    const isCommonError = this.SUPPRESSED_ERRORS.some(suppressedError => 
      error.toLowerCase().includes(suppressedError.toLowerCase())
    );

    if (!isCommonError) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastErrorTime < this.ERROR_SUPPRESSION_DURATION) {
      return true;
    }
    this.lastErrorTime = now;
    return false;
  }

  private isRecentlyScanned(decodedText: string): boolean {
    const now = Date.now();
    const lastScanTime = this.recentScans.get(decodedText);
    
    this.recentScans.forEach((timestamp, code) => {
      if (now - timestamp > this.DUPLICATE_CHECK_DURATION) {
        this.recentScans.delete(code);
      }
    });

    if (lastScanTime && now - lastScanTime < this.DUPLICATE_CHECK_DURATION) {
      return true;
    }

    this.recentScans.set(decodedText, now);
    return false;
  }

  async stopScanner() {
    this.logger.debug('Stopping scanner');
    try {
      if (this.activeStream) {
        this.activeStream.getTracks().forEach(track => track.stop());
        this.activeStream = null;
      }
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