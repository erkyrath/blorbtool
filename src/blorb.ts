import { u8ToString, stringToU8 } from './datutil';

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

export function new_chunk(type:string|Uint8Array, data:Uint8Array) : Chunk
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

export function blorb_recompute_positions(blorb: Blorb) : Blorb
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
