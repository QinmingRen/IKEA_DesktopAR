import { Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'itemprofile-page',
  templateUrl: './itemprofile.component.html',
  styleUrls: ['./itemprofile.component.css']
})
export class ItemProfileComponent{
    @Input() item: any;

    tempItemNos : string;
    ngOnInit(){
      this.tempItemNos = this.item.itemNos.join('\n');
    }

    ngOnDestroy(){
      this.item.itemNos = [];
      var tempArr = this.tempItemNos.split("\n");
      tempArr.forEach(ele => {
        var number : string;
        number = ele.trim();
        if (number != "")
        {
          number = "0".repeat(8 - number.length) + number;
          this.item.itemNos.push(number);  
        }
      });
      console.log(this.item.itemNos);
    }
}
