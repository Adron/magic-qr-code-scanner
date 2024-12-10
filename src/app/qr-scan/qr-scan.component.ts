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
  statusMessage = '';
  isError = false;
  
  private updateStatus(message: string, isError = false) {
    console.log(`Status: ${message}`);
    this.statusMessage = message;
    this.isError = isError;
  }

  async startScan() {
    this.updateStatus('Starting camera...');
    
    try {
      // First check if we have camera permissions
      this.updateStatus('Requesting camera permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission check
      
      this.isScannerEnabled = true;
      this.html5QrCode = new Html5Qrcode("reader");

      // Get list of cameras
      this.updateStatus('Detecting available cameras...');
      const devices = await Html5Qrcode.getCameras();
      console.log('Available cameras:', devices);

      if (devices && devices.length > 0) {
        // Find front camera (usually the second camera if available)
        const frontCamera = devices.find(device => 
          device.label.toLowerCase().includes('front') ||
          device.label.toLowerCase().includes('user') ||
          device.label.toLowerCase().includes('facetime')
        ) || devices[0]; // fallback to first camera if front camera not found

        this.updateStatus(`Selected camera: ${frontCamera.label}`);

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

        this.updateStatus('Initializing camera...');
        await this.html5QrCode.start(
          frontCamera.id,
          config,
          (decodedText) => {
            console.log('Scanned Successfully:', decodedText);
            this.updateStatus('QR Code scanned successfully!');
            this.stopScanner();
            alert(`QR Code scanned: ${decodedText}`);
          },
          (error) => {
            // Only log critical errors
            if (!error.includes('No QR code found')) {
              this.updateStatus(`Scanner error: ${error}`, true);
            }
          }
        );
        this.updateStatus('Camera ready! Point at a QR code to scan.');
      } else {
        throw new Error('No cameras found');
      }
    } catch (err) {
      console.error('Start Error:', err);
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
    this.updateStatus('Stopping scanner...');
    try {
      if (this.html5QrCode) {
        await this.html5QrCode.stop();
        this.html5QrCode = null;
      }
      this.isScannerEnabled = false;
      this.updateStatus('Scanner stopped.');
    } catch (err) {
      console.error('Error stopping scanner:', err);
      this.updateStatus('Error stopping scanner.', true);
    }
  }

  ngOnDestroy() {
    this.stopScanner();
  }
} 