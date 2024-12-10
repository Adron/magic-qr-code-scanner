import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QrScanComponent } from './qr-scan/qr-scan.component';

const routes: Routes = [
  { path: '', component: QrScanComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
