import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScanComponent } from './qr-scan.component';
import { LoggerService } from '../services/logger.service';
import { QrHistoryService } from '../services/qr-history.service';
import { Html5Qrcode } from 'html5-qrcode';

// Mock the HTML5QrCode class
jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    start: jest.fn((deviceId, config, successCallback) => {
      // Simulate a successful scan
      successCallback('test-qr-code');
      return Promise.resolve();
    }),
    stop: jest.fn().mockResolvedValue(undefined)
  })),
  getCameras: jest.fn().mockResolvedValue([
    { id: 'test-camera', label: 'Test Camera' }
  ])
}));

describe('QrScanComponent', () => {
  let component: QrScanComponent;
  let fixture: ComponentFixture<QrScanComponent>;
  let loggerService: LoggerService;
  let qrHistoryService: QrHistoryService;

  beforeEach(async () => {
    // Mock navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{
            label: 'Test Camera',
            enabled: true,
            stop: jest.fn()
          }]
        })
      },
      writable: true
    });

    await TestBed.configureTestingModule({
      declarations: [QrScanComponent],
      providers: [LoggerService, QrHistoryService]
    }).compileComponents();

    fixture = TestBed.createComponent(QrScanComponent);
    component = fixture.componentInstance;
    loggerService = TestBed.inject(LoggerService);
    qrHistoryService = TestBed.inject(QrHistoryService);
    
    // Create mock reader element
    const readerElement = document.createElement('div');
    readerElement.id = 'reader';
    document.body.appendChild(readerElement);
    
    fixture.detectChanges();
  });

  afterEach(() => {
    const readerElement = document.getElementById('reader');
    if (readerElement) {
      readerElement.remove();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with scanner disabled', () => {
    expect(component.isScannerEnabled).toBeFalsy();
  });

  it('should start scanner and handle QR code detection', async () => {
    const historySpy = jest.spyOn(qrHistoryService, 'addScan');
    const loggerSpy = jest.spyOn(loggerService, 'info');
    
    window.alert = jest.fn(); // Mock alert function
    
    await component.startScan();
    
    expect(component.isScannerEnabled).toBeTruthy();
    expect(historySpy).toHaveBeenCalledWith('test-qr-code');
    expect(loggerSpy).toHaveBeenCalledWith('QR Code scanned', { decodedText: 'test-qr-code' });
  });

  it('should handle scanner stop', async () => {
    const loggerSpy = jest.spyOn(loggerService, 'debug');
    
    await component.startScan();
    await component.stopScanner();
    
    expect(component.isScannerEnabled).toBeFalsy();
    expect(loggerSpy).toHaveBeenCalledWith('Stopping scanner');
  });
}); 