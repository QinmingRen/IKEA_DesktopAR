import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'join', pure: false})
export class ArrayJoinPipe implements PipeTransform {
  transform(value: any): any {
    if (value == null) return value;
    if (!Array.isArray(value)) return value;
    var result = value.join(',');
    if (result.length > 36)
    {
      result = result.substr(0, 35) + "...";
    }
    return result;
  }

  private supports(obj: any): boolean { return Array.isArray(obj); }
}