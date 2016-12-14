import {Injectable} from '@angular/core';
import {SafeHtml, DomSanitizer} from '@angular/platform-browser';

@Injectable()
export class SyntaxService {

  constructor(
    private sanitizer: DomSanitizer
  ) {}

  /** Adapted from http://stackoverflow.com/a/7220510/458614 */
  prettyPrintJson(obj: Object | string): SafeHtml {
    let json = typeof obj !== 'string' ? JSON.stringify(obj, null, 2) : obj;

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    json = json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        let cls = 'number';

        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
          }
        }
        else if (/true|false/.test(match)) {
          cls = 'boolean';
        }
        else if (/null/.test(match)) {
          cls = 'null';
        }
        else {
          cls = 'number';
        }

        return '<span class="' + cls + '">' + match + '</span>';
    });

    return this.sanitizer.bypassSecurityTrustHtml(json);
  }
}
