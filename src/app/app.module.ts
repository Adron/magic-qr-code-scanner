import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, RouterOutlet } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QrScanComponent } from './qr-scan/qr-scan.component';
import { LogViewerComponent } from './components/log-viewer/log-viewer.component';
import { QrHistoryComponent } from './components/qr-history/qr-history.component';

@NgModule({
  declarations: [
    AppComponent,
    QrScanComponent,
    LogViewerComponent,
    QrHistoryComponent
  ],
  imports: [
    BrowserModule,
    RouterModule,
    RouterOutlet,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
