import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule }   from '@angular/forms'; 
import { FileUploadModule } from 'ng2-file-upload';

import { AppComponent } from './app.component';
import { ARComponent } from './ar.component';
import { ConfigComponent } from './config.component';
import { ProfileComponent } from './profile.component';
import { PrintComponent } from './print.component';
import { ItemProfileComponent } from "./itemprofile.component";
import { HttpClientModule } from '@angular/common/http';
import { ArrayJoinPipe } from "./array-join.pipe";
import { Color2HexPipe } from "./color2hex.pipe"

@NgModule({
  declarations: [
    AppComponent,
    ARComponent,
    ConfigComponent,
    ProfileComponent,
    PrintComponent,
    ItemProfileComponent,
    ArrayJoinPipe,
    Color2HexPipe,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    FileUploadModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
