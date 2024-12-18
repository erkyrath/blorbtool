/* Utility functions to turn various types into human-readable
   strings. */

export function byte_to_hex(val: number) : string
{
    let res = val.toString(16).toUpperCase();
    // leftpad can go whistle
    while (res.length < 2)
        res = '0'+res;
    return res;
}

export function pretty_size(len: number) : string
{
    if (len == 1)
        return '1 byte';
    if (len < 2000)
        return len + ' bytes';

    let rval: number;
    let unit: string;
    let places = 2;
    
    if (len < 10000) {
        rval = len / 1000;
        unit = 'kb';
        places = 3;
    }
    else if (len < 1000000) {
        rval = len / 1000;
        unit = 'kb';
        places = 2;
    }
    else if (len < 10000000) {
        rval = len / 1000000;
        unit = 'Mb';
        places = 3;
    }
    else {
        rval = len / 1000000;
        unit = 'Mb';
        places = 2;
    }
    
    let sval = '' + rval;
    let pos = sval.indexOf('.');
    if (pos >= 0) {
        sval = sval.slice(0, pos+places);
    }
    return sval + ' ' + unit;
}
