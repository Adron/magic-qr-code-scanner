import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrScanComponent } from './qr-scan.component';
import { LoggerService } from '../services/logger.service';
import { QrHistoryService } from '../services/qr-history.service';
import { Html5Qrcode } from 'html5-qrcode';

// Mock the HTML5QrCode class first
jest.mock('html5-qrcode');

// Then create the mock implementation
const mockHtml5Qrcode = {
  getCameras: jest.fn().mockResolvedValue([
    { id: 'test-camera', label: 'Front Camera' }
  ]),
  start: jest.fn().mockImplementation((deviceId, config, successCallback) => {
    // Simulate a successful scan after a short delay
    setTimeout(() => successCallback('test-qr-code'), 100);
    return Promise.resolve();
  }),
  stop: jest.fn().mockResolvedValue(undefined)
};

// And set it as the mock implementation
(Html5Qrcode as jest.Mock).mockImplementation(() => mockHtml5Qrcode);
Html5Qrcode.getCameras = mockHtml5Qrcode.getCameras;

describe('QrScanComponent', () => {
  let component: QrScanComponent;
  let fixture: ComponentFixture<QrScanComponent>;
  let loggerService: LoggerService;
  let qrHistoryService: QrHistoryService;

  beforeEach(async () => {
    // Mock navigator.mediaDevices
    const mockStream = {
      getVideoTracks: () => [{
        label: 'Test Camera',
        enabled: true,
        stop: jest.fn()
      }],
      getTracks: () => [{
        label: 'Test Camera',
        enabled: true,
        stop: jest.fn()
      }]
    };

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(mockStream)
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
    
    // Mock window.alert
    window.alert = jest.fn();
    
    fixture.detectChanges();
  });

  afterEach(() => {
    const readerElement = document.getElementById('reader');
    if (readerElement) {
      readerElement.remove();
    }
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with scanner disabled', () => {
    expect(component.isScannerEnabled).toBeFalsy();
  });

  it('should start scanner successfully', async () => {
    const loggerSpy = jest.spyOn(loggerService, 'debug');
    
    await component.startScan();
    
    expect(component.isScannerEnabled).toBeTruthy();
    expect(loggerSpy).toHaveBeenCalledWith('Starting QR scanner');
  });

  it('should handle QR code detection', (done) => {
    const historySpy = jest.spyOn(qrHistoryService, 'addScan');
    const loggerSpy = jest.spyOn(loggerService, 'info');
    
    component.startScan().then(() => {
      // Wait for the mock scan to complete
      setTimeout(() => {
        expect(historySpy).toHaveBeenCalledWith('test-qr-code');
        expect(loggerSpy).toHaveBeenCalledWith('QR Code scanned', { decodedText: 'test-qr-code' });
        expect(window.alert).toHaveBeenCalledWith('QR Code scanned: test-qr-code');
        done();
      }, 150);
    });
  });

  it('should handle scanner stop', async () => {
    const loggerSpy = jest.spyOn(loggerService, 'debug');
    
    await component.startScan();
    await component.stopScanner();
    
    expect(component.isScannerEnabled).toBeFalsy();
    expect(loggerSpy).toHaveBeenCalledWith('Stopping scanner');
  });
}); 