import { u8ToString, u8read4, stringToU8 } from './datutil';

let keycounter = 0;

type Chunk = {
    reactkey: number,
    
    stype: string, // [4]
    utype: Uint8Array, // [4]
    
    data: Uint8Array,
};

function new_chunk(type:string|Uint8Array, data:Uint8Array) : Chunk
{
    let stype: string;
    let utype: Uint8Array;
    
    if (typeof type === 'string') {
        stype = type;
        utype = stringToU8(type);
    }
    else {
        utype = type;
        stype = u8ToString(type);
    }

    return {
        reactkey: keycounter++,
        stype: stype,
        utype: utype,
        data: data,
    }
}

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
        let uctype = dat.slice(pos, pos+4);
        let ctype = u8ToString(uctype);
        let clen = u8read4(dat, pos+4);
        let cpos = pos;
        pos += 8;

        if (pos+clen > len) {
            console.log('### Blorb chunk looks truncated');
            break;
        }

        let chunk: Chunk;
        if (ctype == 'FORM') {
            let formtype = u8ToString(dat, pos, 4);
            let cdat = dat.slice(cpos, pos+clen);
            console.log('###', ctype, formtype, clen+'+8', cpos);
            chunk = new_chunk(uctype, cdat);
        }
        else {
            let cdat = dat.slice(pos, pos+clen);
            console.log('###', ctype, clen, cpos);
            chunk = new_chunk(uctype, cdat);
        }

        chunks.push(chunk);

        pos += clen;
        if (pos & 1)
            pos++;
    }

    let blorb = { chunks: chunks };
    console.log('### blorb:', blorb);
    return blorb;
}

