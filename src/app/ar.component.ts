import { Component, OnInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

import 'rxjs/add/observable/forkJoin';
import { parse } from 'querystring';
import { setTimeout } from 'timers';

declare var IKEA_main : any;

@Component({
  selector: 'ar-page',
  templateUrl: './ar.component.html',
  styleUrls: ['./ar.component.css']
})
export class ARComponent implements OnInit {
  @Input() deviceid: any;
  surveyUrl: SafeResourceUrl;

  constructor(private http: HttpClient, private ref: ChangeDetectorRef, private sanitizer: DomSanitizer) {
    this.surveyUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      "https://www.jiandaoyun.com/f/5b0b6ef359b9be5eefe22e66");
  }

  models : any;

  //floors = [{thumb: 'floor_001.jpg', obj_name: "Floor_Sample1", mtl_name:"Floor01"},
  //{thumb: 'floor_002.jpg', obj_name: "Floor_Sample2", mtl_name:"Floor02"},
  //{thumb: 'floor_003.jpg', obj_name: "Floor_Sample3", mtl_name:"Floor03"},
  //{thumb: 'floor_004.jpg', obj_name: "Floor_Sample4", mtl_name:"Floor04"},
  //{thumb: 'floor_005.jpg', obj_name: "Floor_Sample5", mtl_name:"Floor05"},
  //{thumb: 'floor_006.jpg', obj_name: "Floor_Sample6", mtl_name:"Floor06"}];
  floors = [{ thumb: 'floor_007.jpg', obj_name: 'Floor_Sample1', mtl_name: "Floor01" },
  { thumb: 'floor_008.jpg', obj_name: 'Floor_Sample2', mtl_name: "Floor02" }];
  
  profiles: any;
  showTooltip = false;

  visibleModels = {};
  visibleModelsArray = [];


  groupdata = {};
  medata = {};

  selModel : any;

  showQuotation = false;
  showRoomOpt = false;
  showCandidatesTool = false;
  showSurvey = false;
  showProfile = false;
  cabinPrice = 0;
  topPrice = 0;
  installPrice = 0;
  totalPrice = 0;
  totalLength = 0;

  zoneWidth = 4000;
  zoneDepth = 2500;
  calibMode = false;

  sceneWidth = 0;
  sceneHeight = 0;
  sceneRegionVisible = false;

  selected_obj: any;
  selected_markerid: any;
  modelCandidates = [];
  currentProfile = "VEDDINGE";
  color_profiles = [{ name: "VEDDINGE", cname:"维丁格", thumb: "VEDDINGE.jpg"},
                    { name: "BODBYN OFF-WHITE", cname: "伯德比 灰白", thumb: "BODBYN_OFF_WHITE.jpg"},
                    {name: "BODBYN GRY", cname:"伯德比 灰", thumb: "BODBYN_GREY.jpg"},
                    {name: "KALLARP BLUE", cname:"卡勒普", thumb: "KALLARP.jpg"},
                    { name: "HAGGEBY", cname:"哈格比", thumb: "HAGGEBY.jpg"},
                    {name: "TORHAMN", cname:"图汗", thumb: "TORHAMN.jpg"},
                    {name: "HITTARP", cname:"希塔普", thumb: "HITTARP.jpg"},
                    {name: "TINGRSRYD BLK", cname:"廷瑞德", thumb: "TINGRSRYD.jpg"},
                    {name: "RINGHULT WHI", cname:"林胡特 白色", thumb: "RINGHULT_WHITE.jpg"},
                    {name: "RINGHULT GRY", cname:"林胡特 灰色", thumb: "RINGHULT_GREY.jpg"},
                    {name: "VOXTORP", cname:"沃托普", thumb: "VOXTORP.jpg"},
                    {name: "EDSERUM", cname:"爱哲伦", thumb: "EDSERUM.jpg"},
                    {name: "LERHTTYAN BLK", cname:"雷尔休坦 黑漆", thumb: "LERHTTYAN_BLK.jpg" },
                    {name: "LERHTTYAN GRY", cname:"雷尔休坦 淡灰色", thumb: "LERHTTYAN_GRY.jpg" },
                  ];
  itemPrices = [];

  ngOnInit() {
    IKEA_main.init(this.deviceid);
    IKEA_main.selected_cb = this.on_ModelSelected;
    IKEA_main.preload_cb = this.on_PreLoadModel;
    IKEA_main.postload_cb = this.on_ModelLoaded;
    IKEA_main.unload_cb = this.on_ModelUnloaded;
    IKEA_main.ontap_cb = this.on_Tap;
    IKEA_main.scene_region_update_cb = this.on_regionUpdated;
    this.http.get(window.location.href + 'assets/database.json').subscribe(data => {
      this.medata = data['memodels'];
      var groups = data['groups'];
      var keys = Object.keys(groups);
      keys.forEach(k_full => {
        var subkeys = k_full.split(',');
        subkeys.forEach(k => {
          k = k.trim();
          if (null == this.groupdata[k])
            this.groupdata[k] = {};
          var mecode = groups[k_full][0];
          this.groupdata[k].active = mecode;
          this.groupdata[k].candidates = groups[k_full];

          IKEA_main.setMarkerMapping(mecode, k, this.medata[mecode].rotation);
        })
      });
    });

    //this.http.get(window.location.href + 'me_data').subscribe(data => {
    //  this.medata = data;
    //  this.http.get(window.location.href + 'group_data').subscribe(data => {
    //    var keys = Object.keys(data);
    //    keys.forEach(k_full => {
    //      var subkeys = k_full.split(',');
    //      subkeys.forEach(k => {
    //        k = k.trim();
    //        if (null == this.groupdata[k])
    //          this.groupdata[k] = {};
    //        var mecode = data[k_full][0];
    //        this.groupdata[k].active = mecode;
    //        this.groupdata[k].candidates = data[k_full];

    //        IKEA_main.setMarkerMapping(mecode, k, this.medata[mecode].rotation);
    //      })
    //    })
    //  });
    //});
 
    var width = localStorage.getItem("width");
    var height = localStorage.getItem("height");
    if (width) {
      IKEA_main.setCameraWidth(parseInt(width) / 1000);
    }
    if (height) {
      IKEA_main.setCameraHeight(parseInt(height) / 1000);
    }
  }

  on_regionUpdated = (width, height, vis) => {
    this.sceneWidth = Math.round(width * 100) / 100;
    this.sceneHeight = Math.round(height * 100) / 100;
    this.sceneRegionVisible = vis;
    this.ref.detectChanges();
  }

  on_Tap = ()=>{
    this.showRoomOpt = false;
    this.showQuotation = false;
    this.showProfile = false;
    this.showSurvey = false;
    this.ref.detectChanges();
  }

  on_ModelSelected = (marker_id: any) =>
  {
    this.modelCandidates = [];
    if (marker_id == -1)
    {
      this.selected_obj = null;
      this.selected_markerid = -1;
      return;
    }

    var sel_group = this.groupdata[marker_id];

    sel_group.candidates.forEach(ele => {
      if (ele != sel_group.active) {
        this.modelCandidates.push(ele);
      }
    });

    this.selected_obj = this.medata[sel_group.active]
    this.selected_markerid = marker_id;
    this.showCandidatesTool = true;
    if (this.modelCandidates.length > 0) {
      this.showTooltip = true;
      var handle = setTimeout(() => {
        this.showTooltip = false;
      }, 2000);
    }
  }

  on_ModelUnloaded = (marker_id: any) => {
    var model = this.visibleModels[marker_id];
    if (model != null)
    {
      delete this.visibleModels[marker_id];
    }
    if (this.selected_obj && this.selected_markerid == marker_id)
    {
      this.selected_obj = null;
      this.selected_markerid = -1;
      this.modelCandidates = [];
      this.showCandidatesTool = false;
    }
    this.refreshPrice();
  }

  on_PreLoadModel = (marker_id: any) => {
    var mecode = this.groupdata[marker_id].active;
    this.visibleModels[marker_id] = this.medata[mecode];
    this.ref.detectChanges();
  }

  on_ModelLoaded = (marker_id: any) =>{
    this.refreshPrice();
  }

  use_alterModel(marker_id) : boolean
  {
    return false;
    //var result = false;
    //var model = this.models.find(ele=>(ele.marker_id == marker_id));
    //model.itemNos.forEach(ele=>{
    //  var itemNo = ele;
    //  //Find override itemNo
    //  var profile = this.profiles.find(it=>(it[0] == ele));
    //  itemNo = (profile != null) ? profile[this.currentProfile] : ele;
    //  if (itemNo < 1000)
    //  {
    //    result = true;
    //  }
    //});
    //return result;
  }

  on_ChangeTo(m : any)
  {
    if (m == null) return;
    var group = this.groupdata[this.selected_markerid];
    group.active = m;
    //if (this.use_alterModel(m.marker_id))
    //{
    //  IKEA_main.setMarkerMapping(m.model_name + "_1", this.selected_obj.marker_id, this.selected_obj.init_rot);
    //}
    //else
    {
      IKEA_main.setMarkerMapping(m, this.selected_markerid, this.selected_obj.rotation);
    }    
  }

  on_FloorClick(f : any)
  {
    IKEA_main.change_floor(f.obj_name, f.mtl_name);
  }

  isEmptyObject(obj) {
    for (var key in obj) {
      return false;
    }
    return true;
  }

  getValidLength(name : string)
  {
    if (name.indexOf("墙柜") > 0) return 0;
    var str = /[0-9]*/.exec(name);
    return parseFloat(str[0]) / 100;
  }

  refreshPrice()
  {
    this.totalPrice = 0;
    this.cabinPrice = 0;
    this.topPrice = 0;
    this.installPrice = 0;
    this.totalLength = 0;

    var itemData = [];
    var requests = [];
    for (var viskey in this.visibleModels) {
      var model = this.visibleModels[viskey];
      if (this.isEmptyObject(model.components)) continue;
      model.price = 0;
      model.components[this.currentProfile].forEach(ele => {
        model.price += parseInt(ele.price_local) * parseInt(ele.quantity);
      });
      this.cabinPrice += model.price;
      var validLength = this.getValidLength(model.cname);
      if (validLength > 0)
      {
        this.topPrice += 999 * validLength;
        this.installPrice += 430 * validLength;
        this.totalLength += validLength;
      }
    }

    this.totalLength = Math.round(this.totalLength * 100) / 100;
    this.topPrice = Math.round(this.topPrice);
    this.installPrice = Math.round(this.installPrice);
    this.totalPrice = this.cabinPrice + this.topPrice + this.installPrice;

    this.visibleModelsArray = [];
    for (var k in this.visibleModels) {
      if (!this.isEmptyObject(this.visibleModels[k].components)) {
        this.visibleModelsArray.push(this.visibleModels[k]);
      }
    }
    this.ref.detectChanges();
  }

  on_ShowQuotation()
  {
    this.refreshPrice();
    this.showQuotation = !this.showQuotation;
    this.showRoomOpt = false;
    this.showProfile = false;
    this.showSurvey = false;
  }

  on_ShowRoomOptions()
  {
    this.calibMode = false;
    this.zoneDepth = IKEA_main.getZoneHeight() * 1000;
    this.zoneWidth = IKEA_main.getZoneWidth() * 1000;
    this.showRoomOpt = !this.showRoomOpt;
    this.showQuotation = false;
    this.showProfile = false;
    this.showSurvey = false;
  }

  on_ShowProfileTool()
  {
    this.showProfile = !this.showProfile;
    this.showRoomOpt = false;
    this.showQuotation = false;
    this.showSurvey = false;
  }

  on_ShowMaterialTool()
  {
    this.showCandidatesTool = !this.showCandidatesTool;
  }

  on_ShowSurvey()
  {
    this.showSurvey = !this.showSurvey;
  }

  on_RoomOK()
  {
    if (this.calibMode)
    {
      IKEA_main.setCameraWidth(this.zoneWidth / 1000);
      IKEA_main.setCameraHeight(this.zoneDepth / 1000);
      localStorage.setItem("width", (this.zoneWidth).toString());
      localStorage.setItem("height", (this.zoneDepth).toString());
    }
    else
    {
      var width = this.zoneWidth;
      if (width > IKEA_main.getCameraWidth() * 1000)
      {
        width = IKEA_main.getCameraWidth() * 1000;
      }
      width = width < 1500 ? 1500 : width;

      var height = this.zoneDepth;
      if (height > IKEA_main.getCameraHeight() * 1000)
      {
        height = IKEA_main.getCameraHeight() * 1000;
      }
      height = height < 1500 ? 1500 : height;
      
      IKEA_main.setZoneWidth(width / 1000);
      IKEA_main.setZoneHeight(height / 1000);
    }
  }

  on_ProfileChanged(profile : any)
  {
    var index = this.color_profiles.indexOf(profile);
    IKEA_main.change_profile(profile.name);
    this.currentProfile = profile.name;
    this.refreshPrice();
    /*
    this.visibleModels.forEach(ele=>{
      var obj = this.models.find((model)=>(model.marker_id == ele.marker_id));
      var marker_id = ele.marker_id;
      if (obj.override_marker_id!= null)
      {
        marker_id = obj.override_marker_id;
      }
      if (this.use_alterModel(marker_id))
      {
        IKEA_main.setMarkerMapping(ele.model.model_name + "_1", ele.marker_id, ele.init_rot);
      }
      else
      {
        IKEA_main.setMarkerMapping(ele.model.model_name, ele.marker_id, ele.init_rot);
      }    
    });
    */
  }

  on_Print()
  {
    var printContents = document.getElementById("quotation").innerHTML;
    var popupWin = window.open('', '_blank', 'width=300,height=300');
    popupWin.document.open();
    popupWin.document.write('<html><head><link rel="stylesheet" type="text/css" href="style.css" />'
    + '</head><body onload="window.print(); window.close();">' 
    + printContents 
    + '</body></html>');
    popupWin.document.close();
  }

  on_CalibMode(){
    this.calibMode = !this.calibMode;
    if (this.calibMode)
    {
      this.zoneDepth = IKEA_main.getCameraHeight();
      this.zoneWidth = IKEA_main.getCameraWidth();  
    }
    else
    {
      this.zoneDepth = IKEA_main.getZoneHeight() * 1000;
      this.zoneWidth = IKEA_main.getZoneWidth() * 1000;  
    }
  }
}
