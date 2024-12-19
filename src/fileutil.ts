import { u8ToString, looksLikeAscii } from './datutil';
import { find_dimensions_png, find_dimensions_jpeg } from './imgutil';

const suffix_to_type_map: Map<string, string> = new Map([
    [ 'txt',  'TEXT' ],
    [ 'text', 'TEXT' ],
    [ 'xml',  'IFmd' ],  // the only kind of XML we're likely to run into
    [ 'png',  'PNG ' ],
    [ 'jpg',  'JPEG' ],
    [ 'jpeg', 'JPEG' ],
    [ 'aiff', 'AIFF' ],
    [ 'ifiction', 'IFmd' ],
]);

export function determine_file_type(filename: string, data: Uint8Array) : string
{
    let fnguess: string|undefined;
    let datguess: string|undefined;
    
    let dotpos = filename.lastIndexOf('.');
    if (dotpos >= 0) {
        let suffix = filename.slice(dotpos+1).toLowerCase();
        fnguess = suffix_to_type_map.get(suffix);
    }

    if (find_dimensions_png(data)) {
        datguess = 'PNG ';
    }
    else if (find_dimensions_jpeg(data)) {
        datguess = 'JPEG ';
    }
    else if (u8ToString(data.slice(0,4)) == 'Glul') {
        datguess = 'GLUL';
    }
    else if (looksLikeAscii(data)) {
        datguess = 'TEXT';
    }
    else if (data[0] >= 1 && data[0] <= 8) {
        datguess = 'ZCOD';
    }

    console.log('### guesses:', fnguess, datguess);
    return '###';
}
