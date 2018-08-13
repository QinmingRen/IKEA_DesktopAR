import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'profile-page',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent{
    constructor(private http: HttpClient){}

    Profiles : any;
    excelString : string;

    ngOnInit(){
        this.http.get(window.location.href + "profiles").subscribe(data=>{
            this.Profiles = data;
        });
        if (this.Profiles == null)
        {
            this.Profiles = new Array();
        }
    }

    ngOnDestroy(){
        this.on_Save();
    }

    on_AddNew(){
        if (this.excelString.trim() == null) return;
        var newArr = this.excelString.split('\t');
        if (newArr.length < 13)
        {
            newArr.fill('\t', newArr.length, 13 - newArr.length);
        }

        for (var i = 0; i < newArr.length; ++i)
        {
            newArr[i] = newArr[i].trim();
            newArr[i] = "0".repeat(8 - newArr[i].length) + newArr[i];
        }

        var index = this.Profiles.findIndex(ele=>(ele[0] == newArr[0]));
        if (index < 0)
        {
            this.Profiles.push(newArr);
        }
        else{
            console.log("Data Exists!");
        }
        this.excelString = "";
    }

    on_Save()
    {
        this.http.post('/update_profiles', 
        JSON.stringify(this.Profiles),
         {headers: new HttpHeaders({"Content-Type" : 'application/json; charset=utf-8'})})
        .subscribe();
    }
}
