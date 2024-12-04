import { u8ToString, stringToU8 } from './datutil';

export type ChunkType = {
    stype: string, // four characters
    utype: Uint8Array, // four bytes
}

function make_chunk_type(type:string|Uint8Array) : ChunkType
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

    return { stype:stype, utype:utype };
}

let keycounter = 0;

export type Chunk = {
    // unique identifier for this chunk -- internal use only
    reactkey: number, 

    type: ChunkType,
    isform: boolean, // true if stype is 'FORM'

    data: Uint8Array,

    // The pos is recomputed every time the blorb updates.
    pos: number,
};

export function new_chunk(type:string|Uint8Array, data:Uint8Array) : Chunk
{
    let ctype = make_chunk_type(type);
    
    return {
        reactkey: keycounter++,
        type: ctype,
        isform: (ctype.stype==='FORM'),
        data: data,
        pos: 0,
    }
}

export function chunk_readable_desc(chunk: Chunk) : string
{
    if (chunk.isform) {
        //###
        return 'Unrecognized form chunk';
    }
    
    switch (chunk.type.stype) {
    case 'RIdx': return 'Resource index';
    case 'IFmd': return 'Metadata';
    case 'JPEG': return 'Image \u2013 JPEG';
    case 'PNG ': return 'Image \u2013 PNG';
    case 'GLUL': return 'Game file \u2013 Glulx';
    }
    
    return 'Unrecognized chunk';
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
    if (ridx.type.stype != 'RIdx') {
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
