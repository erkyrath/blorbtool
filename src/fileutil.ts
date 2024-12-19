import { u8ToString, looksLikeAscii } from './datutil';
import { find_dimensions_png, find_dimensions_jpeg } from './imgutil';

export function filetype_readable_desc(filetype: string) : string
{
    switch (filetype) {
    case 'TEXT': return 'text';
    case 'BINA': return 'binary data';
    case 'IFmd': return 'iFiction (XML)';
    case 'PNG ': return 'PNG (image)';
    case 'JPEG': return 'JPEG (image)';
    case 'AIFF': return 'AIFF (audio)';
    case 'OGGV': return 'Ogg (audio)';
    case 'ZCOD': return 'Z-code (game)';
    case 'GLUL': return 'Glulx (game)';
    case 'IFRS': return 'blorb';
    default: return 'unknown data';
    }
}

const suffix_to_type_map: Map<string, string> = new Map([
    [ 'txt',  'TEXT' ],
    [ 'text', 'TEXT' ],
    [ 'xml',  'IFmd' ],  // the only kind of XML we're likely to run into
    [ 'png',  'PNG ' ],
    [ 'jpg',  'JPEG' ],
    [ 'jpeg', 'JPEG' ],
    [ 'aiff', 'AIFF' ],
    [ 'ifiction', 'IFmd' ],
    [ 'ulx', 'GLUL' ],
    [ 'z1', 'ZCOD' ],
    [ 'z2', 'ZCOD' ],
    [ 'z3', 'ZCOD' ],
    [ 'z4', 'ZCOD' ],
    [ 'z5', 'ZCOD' ],
    [ 'z6', 'ZCOD' ],
    [ 'z7', 'ZCOD' ],
    [ 'z8', 'ZCOD' ],
    [ 'blb', 'IFRS' ],
    [ 'blorb', 'IFRS' ],
    [ 'zblorb', 'IFRS' ],
    [ 'gblorb', 'IFRS' ],
    [ 'ablorb', 'IFRS' ],
]);

export type FileTypeGuess = {
    filetype: string;
    alttype: string|undefined;
};

export function determine_file_type(filename: string, data: Uint8Array) : FileTypeGuess
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
    else if (u8ToString(data.slice(0,4)) == 'FORM' && u8ToString(data.slice(8,12)) == 'AIFF') {
        datguess = 'AIFF';
    }
    else if (u8ToString(data.slice(0,4)) == 'FORM' && u8ToString(data.slice(8,12)) == 'IFRS') {
        datguess = 'IFRS';
    }
    else if (u8ToString(data.slice(0,4)) == 'Glul') {
        datguess = 'GLUL';
    }
    else if (u8ToString(data.slice(0,5)).toLowerCase() == '<?xml') {
        datguess = 'IFmd';
    }
    else if (looksLikeAscii(data)) {
        datguess = 'TEXT';
    }
    else if (data[0] >= 1 && data[0] <= 8) {
        datguess = 'ZCOD';
    }

    console.log('### guesses:', fnguess, datguess);
    
    if (fnguess && datguess && fnguess == datguess) 
        return { filetype:fnguess, alttype:undefined };
    if (fnguess && !datguess) 
        return { filetype:fnguess, alttype:undefined };
    if (datguess && !fnguess) 
        return { filetype:datguess, alttype:undefined };
    if (!datguess && !fnguess)
        return { filetype:'BINA', alttype: undefined };
    return { filetype:(fnguess || 'BINA'), alttype:datguess };
}
