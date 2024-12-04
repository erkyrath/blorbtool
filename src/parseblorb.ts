
function stringToU8(str: string) : Uint8Array
{
    return new Uint8Array([ ...str ].map(ch => ch.charCodeAt(0)));
}

function u8ToString(arr: Uint8Array,
    pos: number|undefined, len: number|undefined) : string
{
    if (pos !== undefined || len !== undefined) {
        let rpos = pos || 0;
        if (len === undefined)
            arr = arr.slice(rpos);
        else
            arr = arr.slice(rpos, rpos+len);
    }
    return [ ...arr ].map(ch => String.fromCharCode(ch) ).join('');
}

function u8read4(arr: Uint8Array, pos: number) : number
{
    return arr[pos] * 0x1000000 + arr[pos+1] * 0x10000 + arr[pos+2] * 0x100 + arr[pos+3];
}

type Chunk = {
    stype: string, // [4]
    utype: Uint8Array, // [4]
    
    data: Uint8Array,
};

type Blorb = {
    chunks: Chunk[];
};

export function new_blorb() : Blorb
{
    return { chunks: [] };
}

export function parse_blorb(dat: Uint8Array) : Blorb
{
    let pos = 0;
    const len = dat.length;
    
    if (len < 12) {
        console.log('### Too short to be a valid blorb file');
        return new_blorb();
    }

    if (u8ToString(dat, 0, 4) != 'FORM') {
        console.log('### This does not appear to be a valid blorb file');
        return new_blorb();
    }

    let foundlen = u8read4(dat, 4);
    if (foundlen+8 != len) {
        console.log('### Blorb length field is incorrect');
        // continue
    }

    if (u8ToString(dat, 8, 4) != 'IFRS') {
        console.log('### This does not appear to be a valid blorb file');
        return new_blorb();
    }

    let chunks = [];
    pos = 12;

    while (pos < len) {
        if (pos+8 > len) {
            console.log('### Blorb data looks truncated');
            break;
        }
        let ctype = u8ToString(dat, pos, 4);
        let clen = u8read4(dat, pos+4);
        pos += 8;

        if (pos+clen > len) {
            console.log('### Blorb chunk looks truncated');
            break;
        }

        let cdat = dat.slice(pos, pos+clen);
        console.log('###', ctype, clen, pos-8);

        pos += clen;
        if (pos & 1)
            pos++;
    }

    let blorb = { chunks: [] };
    console.log('### blorb:', blorb);
    return blorb;
}

