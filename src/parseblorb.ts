import { u8ToString, u8read4, stringToU8 } from './datutil';

let keycounter = 0;

export type Chunk = {
    // unique identifier for this chunk -- internal use only
    reactkey: number, 
    
    stype: string, // four characters
    utype: Uint8Array, // four bytes
    isform: boolean, // true if stype is 'FORM'

    data: Uint8Array,

    // The pos is recomputed every time the blorb updates.
    pos: number,
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
        isform: (stype==='FORM'),
        data: data,
        pos: 0,
    }
}

export type Blorb = {
    filename: string|undefined;
    chunks: Chunk[];
    totallen: number;
};

export function new_blorb() : Blorb
{
    return {
        filename: undefined,
        chunks: [],
        totallen: 0,
    };
}

function blorb_recompute_positions(blorb: Blorb) : Blorb
{
    if (blorb.chunks.length == 0)
        return blorb;

    let ridx = blorb.chunks[0];
    if (ridx.stype != 'RIdx') {
        console.log('### first chunk is not an index');
        return blorb;
    }

    let pos = 12;
    let newls = [];
    for (let chunk of blorb.chunks) {
        if (chunk.pos == pos) {
            newls.push(chunk);
        }
        else {
            let newchunk = { ...chunk, pos:pos };
            newls.push(newchunk);
        }
        if (chunk.isform)
            pos += chunk.data.length;
        else
            pos += (8 + chunk.data.length);
        
        if (pos & 1)
            pos++;
    }
    
    return { ...blorb, chunks:newls, totallen:pos };
}

export function parse_blorb(dat: Uint8Array, filename?: string) : Blorb
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

    let chunks: Chunk[] = [];
    let origposmap: Map<number, number> = new Map();
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
        origposmap.set(chunk.reactkey, cpos);

        pos += clen;
        if (pos & 1)
            pos++;
    }

    let blorb = {
        filename: filename,
        chunks: chunks,
        totallen: pos,
    };
    blorb = blorb_recompute_positions(blorb);

    for (let chunk of blorb.chunks) {
        let pos = origposmap.get(chunk.reactkey);
        if (pos != chunk.pos) {
            console.log('### chunk position was wrong');
        }
    }
    if (blorb.totallen != len) {
        console.log('### inconsistent blorb length');
    }

    return blorb;
}

