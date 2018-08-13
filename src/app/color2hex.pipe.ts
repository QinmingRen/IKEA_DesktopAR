import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'c2h', pure: false})
export class Color2HexPipe implements PipeTransform {
  transform(value: any): any {
    if (value == null) return value;
    if (!Array.isArray(value)) return value;
    var result = "#";
    value.forEach(ele=>{
      var c = parseInt((ele * 255).toFixed());
      var hex = c.toString(16);
      if (hex.length == 1) hex = "0" + hex;
      result += hex;
    });
    return result;
  }

  private supports(obj: any): boolean { return Array.isArray(obj); }
}