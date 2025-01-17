'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog } from '@headlessui/react';

// Add styles at the top of the file
const styles = {
  qrContainer: `
    relative
    w-full
    h-full
    overflow-hidden
    rounded-lg
  `,
  qrOverlay: `
    absolute
    inset-0
    flex
    items-center
    justify-center
    pointer-events-none
    z-10
  `,
  targetBox: `
    border-2
    border-blue-500
    rounded-lg
    w-[280px]
    h-[280px]
    flex
    items-center
    justify-center
  `,
  cornerMarker: `
    absolute
    w-6
    h-6
    border-2
    border-blue-500
  `,
  scanLine: `
    absolute
    w-full
    h-0.5
    bg-blue-500
    animate-scan
  `
};

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [scannedValues, setScannedValues] = useState<string[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Request camera permissions and get available cameras
    const getCameras = async () => {
      try {
        addToEventLog('Requesting camera permissions...');
        // First request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: 'environment'
          } 
        });
        addToEventLog('Camera permission granted');
        
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
        
        // After permission is granted, enumerate devices
        addToEventLog('Enumerating video devices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('All devices:', devices);
        
        const videoDevices = devices.filter(device => {
          console.log('Device:', {
            kind: device.kind,
            label: device.label,
            deviceId: device.deviceId,
            groupId: device.groupId
          });
          return device.kind === 'videoinput';
        });
        
        console.log('Filtered video devices:', videoDevices);
        addToEventLog(`Found ${videoDevices.length} camera(s):`);
        videoDevices.forEach(device => {
          addToEventLog(`- ${device.label || `Camera (${device.deviceId.slice(0, 8)}...)`}`);
        });
        
        setCameras(videoDevices);
      } catch (err) {
        const error = err as Error;
        console.error('Error getting cameras:', error);
        addToEventLog(`Error accessing cameras: ${error.message}`);
      }
    };

    // Initial camera detection
    getCameras();

    // Listen for device changes
    const handleDeviceChange = () => {
      addToEventLog('Device change detected, refreshing camera list...');
      getCameras();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    // Cleanup function
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      if (scannerRef.current) {
        setIsScanning(false);
        try {
          scannerRef.current.stop()
            .then(() => {
              try {
                if (scannerRef.current) {
                  scannerRef.current.clear();
                }
              } catch (error) {
                console.log('Cleanup error (can be ignored):', error);
              }
            })
            .catch(error => console.log('Cleanup error (can be ignored):', error))
            .finally(() => {
              scannerRef.current = null;
              // Clean up any remaining video elements
              const videoElement = document.querySelector('#qr-reader video');
              if (videoElement) {
                videoElement.remove();
              }
              // Clean up the qr-reader element contents
              const qrReader = document.getElementById('qr-reader');
              if (qrReader) {
                qrReader.innerHTML = '';
              }
            });
        } catch (error) {
          console.log('Cleanup error (can be ignored):', error);
          scannerRef.current = null;
        }
      }
    };
  }, []);

  const addToEventLog = (message: string) => {
    setEventLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleScan = (decodedText: string) => {
    addToEventLog(`QR Code scanned: ${decodedText}`);
    setScannedValues(prev => [...prev, decodedText]);
  };

  const startScanning = async (cameraId?: string) => {
    try {
      // Set scanning state first to ensure DOM element is created
      setIsScanning(true);
      
      // Wait for the DOM element to be created
      await new Promise(resolve => setTimeout(resolve, 100));

      const qrContainer = document.getElementById('qr-reader');
      if (!qrContainer) {
        throw new Error('QR reader container not found');
      }

      // Clear existing scanner if it exists
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }

      // Create new scanner instance
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1,
      };

      addToEventLog('Starting camera...');

      await scanner.start(
        cameraId || { facingMode: "environment" },
        config,
        handleScan,
        (errorMessage) => {
          // Suppress common scanning status messages
          const suppressedMessages = [
            "No QR code found",
            "No barcode or QR code detected",
            "No MultiFormat Readers were able to detect the code.",
            "No barcode found"
          ];
          
          if (!suppressedMessages.some(msg => errorMessage.includes(msg))) {
            console.error(errorMessage);
            addToEventLog(`Scanning error: ${errorMessage}`);
          }
        }
      );

      addToEventLog('Camera started successfully');

    } catch (error) {
      console.error('Error starting scanner:', error);
      addToEventLog('Error starting scanner');
      setIsScanning(false);
      
      // Clean up scanner if it was created
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
          scannerRef.current = null;
        } catch (cleanupError) {
          console.error('Error cleaning up scanner:', cleanupError);
        }
      }
    }
  };

  const handleStartScanning = async () => {
    addToEventLog('Checking cameras...');
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      if (videoDevices.length > 1) {
        addToEventLog('Multiple cameras found, showing selection dialog');
        setShowCameraModal(true);
      } else if (videoDevices.length === 1) {
        addToEventLog('Single camera found, starting scanner');
        startScanning(videoDevices[0].deviceId);
      } else {
        addToEventLog('No cameras found');
        throw new Error('No cameras found');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      addToEventLog('Error accessing camera');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        // Set state first to prevent any new scans
        setIsScanning(false);
        
        // Attempt to stop the scanner
        try {
          await scannerRef.current.stop();
        } catch (stopError) {
          console.log('Stop error (can be ignored):', stopError);
        }

        // Clear the scanner with error handling
        try {
          await scannerRef.current.clear();
        } catch (clearError) {
          console.log('Clear error (can be ignored):', clearError);
        }

        // Clean up the scanner reference
        scannerRef.current = null;
        
        // Clean up any remaining video elements
        const videoElement = document.querySelector('#qr-reader video');
        if (videoElement) {
          videoElement.remove();
        }

        // Clean up the qr-reader element contents
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
          qrReader.innerHTML = '';
        }

        addToEventLog('Stopped QR scanner');
      } catch (error) {
        console.error('Error stopping scanner:', error);
        addToEventLog('Error stopping scanner');
        
        // Ensure we still clean up even if there's an error
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const isFirstOccurrence = (value: string, index: number, array: string[]) => {
    return array.indexOf(value) === index;
  };

  const isValidUrl = (str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 text-center text-2xl font-bold">
        QR Scanner
      </header>

      {/* Main content with three panes */}
      <div className="grid grid-cols-3 gap-4 p-4 max-h-[calc(100vh-5rem)] overflow-hidden">
        {/* Left pane - Event log */}
        <div className="border rounded-lg p-4 shadow-md overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Event Log</h2>
          <div className="overflow-y-auto">
            {eventLog.length > 0 ? (
              eventLog.map((event, index) => (
                <div key={index} className="text-sm mb-2">{event}</div>
              ))
            ) : (
              <div className="text-gray-500 italic">No events recorded yet...</div>
            )}
          </div>
        </div>

        {/* Middle pane - QR Scanner */}
        <div className="border rounded-lg p-4 shadow-md overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">QR Scanner</h2>
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="w-full max-w-[min(100%,_400px)] aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center">
              {!isScanning ? (
                <button
                  onClick={handleStartScanning}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start QR Scanner
                </button>
              ) : (
                <>
                  <div className={styles.qrContainer}>
                    <div id="qr-reader" className="w-full h-full" />
                    <div className={styles.qrOverlay}>
                      <div className={styles.targetBox}>
                        {/* Corner markers */}
                        <div className={`${styles.cornerMarker} top-0 left-0 border-t-0 border-l-0`} />
                        <div className={`${styles.cornerMarker} top-0 right-0 border-t-0 border-r-0`} />
                        <div className={`${styles.cornerMarker} bottom-0 left-0 border-b-0 border-l-0`} />
                        <div className={`${styles.cornerMarker} bottom-0 right-0 border-b-0 border-r-0`} />
                        {/* Scanning line */}
                        <div className={styles.scanLine} />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={stopScanning}
                    className="mt-4 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Stop Scanner
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right pane - Scanned Values */}
        <div className="border rounded-lg p-4 shadow-md overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Scanned Values</h2>
          <div className="overflow-y-auto">
            {scannedValues.length > 0 ? (
              scannedValues.map((value, index, array) => (
                <div key={index} className="text-sm mb-2 p-2 bg-gray-800 text-gray-100 rounded flex items-center justify-between">
                  <span className="break-all pr-2">
                    {isValidUrl(value) ? (
                      <a 
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </span>
                  {isFirstOccurrence(value, index, array) ? (
                    <svg className="h-5 w-5 text-green-500 shrink-0 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-yellow-500 shrink-0 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.75 4.5a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No QR codes scanned yet...</div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Selection Modal */}
      <Dialog
        open={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 max-w-sm w-full">
            <Dialog.Title className="text-lg font-medium mb-4 text-gray-900">
              Select Camera
            </Dialog.Title>
            <div className="space-y-4">
              {cameras.map((camera) => (
                <button
                  key={camera.deviceId}
                  className="w-full p-3 text-left border rounded hover:bg-gray-50 text-gray-900"
                  onClick={() => {
                    startScanning(camera.deviceId);
                    setShowCameraModal(false);
                  }}
                >
                  {camera.label || `Camera ${camera.deviceId}`}
                </button>
              ))}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
