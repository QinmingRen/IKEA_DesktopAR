import { Component, OnInit, Input} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { ChangeDetectorRef } from '@angular/core';
import { FileUploader } from 'ng2-file-upload';
import 'rxjs/add/observable/forkJoin';

declare var Marker_Identifier : any;

@Component({
  selector: 'config-page',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent{
    @Input() deviceid: any;
    constructor(private http: HttpClient, private ref: ChangeDetectorRef){}

    models : any;
    showProfilePage = false;
    showItemPage = false;
    sortDir = { mecode:0,
                marker:0,
                price:0,
                index:0,
                group:0};

    selectedModel : any;
    showIdentifier = false;
    temp_marker_id: any;
    temp_marker_rot: number;

    uploader:FileUploader = new FileUploader({    
        url: window.location.origin + "/uploadFile",
        method: "POST",
        removeAfterUpload: true,
    });

    ngOnInit(){
        this.http.get(window.location.origin + "/models").subscribe(data=>{
        this.models = data;
      });
    }

    ngOnDestroy(){
        this.on_Accept();
    }

    on_ShowProfilePage(){
        this.showProfilePage = true;
    }

    on_AddNew(){
        if (this.models == null)
        {
            this.models = [];
        }
        var newData = {index: this.models.length,
        mecode: 0,
        model_name: 'box1',
        marker_id: this.models.length,
        init_rot: 0,
        size_w: 40,
        size_h: 70,
        itemNos: []};
        this.models.push(newData);
    }

    on_Accept(){
        this.http.post('/update_model', 
        JSON.stringify(this.models),
         {headers: new HttpHeaders().set("Content-Type", 'application/json; charset=utf-8')})
        .subscribe();
    }

    deepCopy(source) { 
        var result={};
        for (var key in source) {
            result[key] = typeof source[key]==='object' ? this.deepCopy(source[key]): source[key];
        } 
        return result; 
    }

    on_Copy(item)
    {
        var newItem = this.deepCopy(item);
        this.models.splice(item.index, 0, newItem);
        var idx = 0;
        this.models.forEach(ele => {
            ele.index = idx++;
        });
    }

    on_Remove(item){
        var idx = this.models.findIndex((ele)=>(ele.index == item.index));
        if (idx >= 0)
        {
            this.models.splice(idx, 1);
        }
        idx = 0;
        this.models.forEach(ele => {
            ele.index = idx++;
        });
    }

    on_CheckPrice(item){
        var itemData = [];
        var requests = [];
        item.itemNos.forEach(ele=>{
            requests.push(this.http.get(window.location.href + 'itemdata?id=' + ele));
        });
        Observable.forkJoin(requests)
        .subscribe((result)=>{
            var price = 0;
            var hasError = false;
            result.forEach(item=>{
                var obj : any;
                obj = item;
                if (obj.RetailItemComm.ItemNo.$ == -1){
                    hasError = true;
                }
                var single = obj.RetailItemComm.RetailItemCommPriceList.RetailItemCommPrice.Price.$;
                console.log(obj.RetailItemComm.ItemNo.$ +': ' + single);
                price += single;
            })
            if (hasError)
            {
                alert("Price is(contain error): " + price);
            }
            else
            {
                alert("Price is: " + price);
            }
            
            console.log('Total:' + price);
        });
    }

    on_Sort(field){
        switch(field)
        {
            case 'mecode':
                this.models.sort((a, b)=>{
                    return this.sortDir.mecode == 0 ? (a.mecode - b.mecode) : (b.mecode - a.mecode);
                });
                this.sortDir.mecode = (this.sortDir.mecode + 1) % 2;
                break;
            case 'marker':
                this.models.sort((a, b)=>{
                    return this.sortDir.marker == 0 ? (a.marker_id - b.marker_id) : (b.marker_id - a.marker_id);
                });
                this.sortDir.marker = (this.sortDir.marker + 1) % 2;
                break;
            case 'price':
                this.models.sort((a, b)=>{
                    return this.sortDir.price == 0 ? (a.price - b.price) : (b.price - a.price);
                });
                this.sortDir.price = (this.sortDir.price + 1) % 2;
                break;
            case 'group':
                this.models.sort((a, b)=>{
                    return this.sortDir.group == 0 ? (a.size_h - b.size_h) : (b.size_h - a.size_h);
                });
                this.sortDir.group = (this.sortDir.group + 1) % 2;
                break;
            case 'index':
            default:
                this.models.sort((a, b)=>{
                    return this.sortDir.index == 0 ? (a.index - b.index) : (b.index - a.index);
                });
                this.sortDir.index = (this.sortDir.index + 1) % 2;
                break;
        }
    }

    on_EditItem(item){
        this.showItemPage = true;
        this.selectedModel = item
    }

    markerident_cb = (marker_id, rotZ)=>{
        this.temp_marker_id = marker_id;
        var deg = rotZ / Math.PI * 180 + 180;
        var rot_ele = document.getElementsByName("rotation");
        if (Math.abs(deg) < 45) {
          (<HTMLInputElement>rot_ele[0]).checked = true;
          this.temp_marker_rot = 0;
        }
        else if (Math.abs(deg - 90) < 45) {
          (<HTMLInputElement>rot_ele[1]).checked = true;
          this.temp_marker_rot = Math.PI * 0.5;
        }
        else if (Math.abs(deg - 180) < 45) {
          (<HTMLInputElement>rot_ele[2]).checked = true;
          this.temp_marker_rot = Math.PI;
        }
        else if (Math.abs(deg - 270) < 45) {
          (<HTMLInputElement>rot_ele[3]).checked = true;
          this.temp_marker_rot = Math.PI * 1.5;
        }
        this.ref.detectChanges();
    }

    on_ShowIdentifier(item){
        this.showIdentifier = true;
        this.showItemPage = false;
        this.selectedModel = item;
        this.temp_marker_id = -1;
        Marker_Identifier.init(this.deviceid, this.markerident_cb);
    }

    on_SaveMarkerID(){
        if (this.temp_marker_id != -1)
        {
          this.selectedModel.marker_id = this.temp_marker_id;
          this.selectedModel.init_rot = this.temp_marker_rot;
        }
        this.on_CancelMarkerID();
    }

    on_CancelMarkerID(){
        this.showIdentifier = false;
        Marker_Identifier.dispose();
    }

    on_selectedFileChanged(event) {

        var que = this.uploader.queue[this.uploader.queue.length - 1];
        que.onSuccess = (response, status, headers) => {    
            // 上传文件成功   
            if (status == 200) {
                alert("Parsing succeeded!");
            }else {            
                alert("Parsing failed!");
            }
        };
        que.upload();
    }

    on_set_degree(){
        var rot_ele = document.getElementsByName("rotation");
        if ((<HTMLInputElement>rot_ele[0]).checked){
          this.temp_marker_rot = 0;
        }
        else if ((<HTMLInputElement>rot_ele[1]).checked) {
          this.temp_marker_rot = Math.PI / 2;
        }
        else if ((<HTMLInputElement>rot_ele[2]).checked) {
          this.temp_marker_rot = Math.PI;
        }
        else if ((<HTMLInputElement>rot_ele[3]).checked) {
          this.temp_marker_rot = Math.PI * 1.5;
        }
    }
}
