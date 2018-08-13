import { Component, OnInit} from '@angular/core';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [Location, { provide: LocationStrategy, useClass: PathLocationStrategy }],
})
export class AppComponent{
  showAR = false;
  showConfig = false;
  deviceInfos = [];
  selectedDev: any;
  constructor(private location: Location) { }

  ngOnInit(){
    navigator.mediaDevices.enumerateDevices().then((infos) => {
      infos.forEach(ele => {
        if (ele.kind == 'videoinput') {
          this.deviceInfos.push(ele);
        }
      })
      if (this.deviceInfos.length > 0)
      {
        this.selectedDev = this.deviceInfos[0].deviceId;
      }
      console.log(this.location.path(false));
      if (this.location.path(false) == "")
      {
        this.showAR = true;
      }  
      else if (this.location.path(false) == "?config")
      {
        this.showConfig = true;
      }
    });
  }

  on_ARClicked() {
    this.showConfig = false;
    this.showAR = true;
  }

  on_ConfigClicked(){
    this.showConfig = true; 
    this.showAR = false;
  }
}
