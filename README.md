# QrCodeApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.11.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## iPad Tweaks

changes to better handle iPad and tablet limitations:
Device Detection:
* Added tablet detection logic
* Adjusts settings based on device type
* Logs when tablet mode is active
Camera Selection:
* For tablets: Prefers back camera (usually better quality)
* For desktop/mobile: Prefers front camera
* Falls back gracefully if preferred camera isn't available
Adjusted Distances:
* Changed from 1-3 inches to 4-8 inches for standard mode
* Changed from 8-12 inches to 8-24 inches for distance mode
* More realistic ranges for tablet cameras
Optimized Settings:
* Higher frame rates for tablets (24-30 FPS)
* Fallback settings if high resolution isn't supported
* Disabled image flipping on tablets
* Automatic fallback to simpler settings if advanced ones fail
Error Handling:
Added fallback mode for camera initialization
* Better error messages for tablet users
* Logs actual camera settings for debugging
UI Changes:
* Updated distance ranges in the dropdown
* Changed terminology to "Standard Mode" and "Distance Mode"
* More appropriate messaging for tablet users
These changes should make the scanner work much better on iPads by:
1. Using more appropriate distance ranges
2. Using the better back camera by default
3. Having fallback options if optimal settings aren't available
4. Maintaining good performance with tablet-optimized frame rates
5. Being more resilient to device limitations
