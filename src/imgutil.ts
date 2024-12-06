
import { u8ToString } from './datutil';

type Size = { width:number, height:number };

/* Given a PNG file, extract its dimensions. Return a {width,height}
   object, or undefined on error. 
*/
function find_dimensions_png(arr: Uint8Array) : Size|undefined
{
    let pos = 0;
    if (arr[0] != 0x89 || u8ToString(arr.slice(1,4)) != 'PNG') {
        //console.log('find_dimensions_png: PNG signature does not match');
        return undefined;
    }
    pos += 8;
    while (pos < arr.length) {
        let chunklen = (arr[pos+0] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | (arr[pos+3]);
        pos += 4;
        let chunktype = u8ToString(arr.slice(pos,pos+4));
        pos += 4;
        if (chunktype == 'IHDR') {
            let width  = (arr[pos+0] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | (arr[pos+3]);
            pos += 4;
            let height = (arr[pos+0] << 24) | (arr[pos+1] << 16) | (arr[pos+2] << 8) | (arr[pos+3]);
            pos += 4;
            return { width:width, height:height };
        }
        pos += chunklen;
        pos += 4; /* skip CRC */
    }

    //console.log('find_dimensions_png: no PNG header block found');
    return undefined;
}

/* Given a JPEG file, extract its dimensions. Return a {width,height}
   object, or undefined on error. 
*/
function find_dimensions_jpeg(arr: Uint8Array) : Size|undefined
{
    let pos = 0;
    while (pos < arr.length) {
        if (arr[pos] != 0xFF) {
            //console.log('find_dimensions_jpeg: marker is not 0xFF');
            return undefined;
        }
        while (arr[pos] == 0xFF) 
            pos += 1;
        let marker = arr[pos];
        pos += 1;
        if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
            /* marker type has no data */
            continue;
        }
        let chunklen = (arr[pos+0] << 8) | (arr[pos+1]);
        if (marker >= 0xC0 && marker <= 0xCF && marker != 0xC8) {
            if (chunklen < 7) {
                //console.log('find_dimensions_jpeg: SOF block is too small');
                return undefined;
            }
            let height = (arr[pos+3] << 8) | (arr[pos+4]);
            let width  = (arr[pos+5] << 8) | (arr[pos+6]);
            return { width:width, height:height };
        }
        pos += chunklen;
    }

    //console.log('find_dimensions_jpeg: no SOF marker found');
    return undefined;
}
