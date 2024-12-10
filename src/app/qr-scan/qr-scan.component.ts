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
  private isTablet: boolean;

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
    // Check if device is a tablet/iPad
    this.isTablet = /iPad|tablet|Android(?!.*Mobile)/i.test(navigator.userAgent);
    if (this.isTablet) {
      this.logger.info('Tablet device detected, using tablet-optimized settings');
    }
  }

  private updateStatus(message: string, isError = false, duration = 3000) {
    this.logger.info('Status Update', { message, isError });
    this.statusMessage = message;
    this.isError = isError;
    
    // Clear status message after specified duration unless it's an error
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
        // Distance mode
        await videoTrack.applyConstraints({
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: this.isTablet ? 24 : 15 } // Higher frame rate for tablets
        });
        this.logger.info('Switched to distance mode');
        this.updateStatus('Switched to distance mode (8-24 inches)', false, 3000);
      } else {
        // Standard mode
        await videoTrack.applyConstraints({
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        });
        this.logger.info('Switched to standard mode');
        this.updateStatus('Switched to standard mode (4-8 inches)', false, 3000);
      }
    } catch (error) {
      this.logger.error('Failed to update camera settings', { error });
      this.updateStatus('Failed to change scan mode - continuing with current settings', true);
    }
  }

  private async initializeCamera(deviceId: string): Promise<MediaStream> {
    // Base constraints that work well across devices
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId,
        width: { min: 640, ideal: this.isZoomedMode ? 1920 : 1280, max: 1920 },
        height: { min: 480, ideal: this.isZoomedMode ? 1080 : 720, max: 1080 },
        frameRate: { 
          min: 15, 
          ideal: this.isTablet ? 
            (this.isZoomedMode ? 24 : 30) : // Tablet frame rates
            (this.isZoomedMode ? 15 : 30),  // Non-tablet frame rates
          max: 30 
        },
        facingMode: this.isTablet ? "environment" : "user", // Prefer back camera on tablets
        aspectRatio: { ideal: 1.7777777778 }
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;

      // Log actual track settings for debugging
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      this.logger.info('Actual camera settings:', settings);

      return stream;
    } catch (error) {
      // If high resolution fails, try with more basic settings
      this.logger.warn('Failed to initialize with high resolution, trying fallback settings', { error });
      const fallbackConstraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId,
          facingMode: this.isTablet ? "environment" : "user"
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      this.activeStream = stream;
      return stream;
    }
  }

  private shouldSuppressError(error: string): boolean {
    // Check if the error message contains any of the suppressed phrases
    const isCommonError = this.SUPPRESSED_ERRORS.some(suppressedError => 
      error.toLowerCase().includes(suppressedError.toLowerCase())
    );

    if (!isCommonError) {
      return false; // Don't suppress uncommon errors
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
    
    // Clean up old entries
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

  async startScan() {
    this.logger.debug('Starting QR scanner');
    this.updateStatus('Starting camera...', false, 0);
    
    try {
      this.isScannerEnabled = true;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const readerElement = document.getElementById('reader');
      if (!readerElement) {
        throw new Error('QR Scanner element not found');
      }

      this.logger.debug('Detecting cameras');
      const devices = await Html5Qrcode.getCameras();
      this.logger.info('Available cameras', { devices });

      if (devices && devices.length > 0) {
        // For tablets, prefer back camera if available
        const preferredCamera = this.isTablet ?
          devices.find(device => 
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          ) || devices[0] :
          devices.find(device => 
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('user') ||
            device.label.toLowerCase().includes('facetime')
          ) || devices[0];

        this.logger.info('Selected camera', { camera: preferredCamera });

        // Initialize camera with current mode settings
        await this.initializeCamera(preferredCamera.id);

        this.html5QrCode = new Html5Qrcode("reader");

        const config = {
          fps: this.isTablet ? 
            (this.isZoomedMode ? 24 : 30) : // Tablet frame rates
            (this.isZoomedMode ? 15 : 30),  // Non-tablet frame rates
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: this.isTablet, // Disable flip on tablets
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        this.logger.debug('Starting camera with config', { config });
        await this.html5QrCode.start(
          preferredCamera.id,
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