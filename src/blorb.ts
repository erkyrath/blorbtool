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
    formtype: ChunkType|undefined, // set if type is 'FORM'

    data: Uint8Array,

    // The pos is recomputed every time the blorb updates.
    pos: number,
};

type ChunkResIndex = {
    // unique identifier for this chunk -- internal use only
    reactkey: number, 

    type: ChunkType,
    formtype: ChunkType|undefined, // set if type is 'FORM'

    data: Uint8Array,

    // The pos is recomputed every time the blorb updates.
    pos: number,

    flag: boolean;
};

export function new_chunk(type:string|Uint8Array, data:Uint8Array) : Chunk
{
    let ctype = make_chunk_type(type);
    
    let formtype: ChunkType|undefined;
    if (ctype.stype === 'FORM') {
        formtype = make_chunk_type(data.slice(8, 12));
    }
    
    return {
        reactkey: keycounter++,
        type: ctype,
        formtype: formtype,
        data: data,
        pos: 0,
    }
}

export function chunk_readable_desc(chunk: Chunk) : string
{
    if (chunk.formtype) {
        switch (chunk.formtype.stype) {
        case 'AIFF': return 'Audio \u2013 AIFF';
        }
        return 'Unrecognized form chunk';
    }
    
    switch (chunk.type.stype) {
    case 'RIdx': return 'Resource index';
        
    case 'IFhd': return 'Game identifier';
    case 'Fspc': return 'Frontispiece';
    case 'RDes': return 'Resource description';
    case 'Plte': return 'Color palette';
    case 'IFmd': return 'Metadata';

    case 'AUTH': return 'Author';
    case '(c) ': return 'Copyright message';
    case 'ANNO': return 'Annotation';
    case 'SNam': return 'Story name (deprecated)';

    case 'RelN': return 'Release number (Z-code)';
    case 'Reso': return 'Resolution';
    case 'APal': return 'Adaptive palette';
    case 'Loop': return 'Audio looping';
       
    case 'TEXT': return 'Text';
    case 'BINA': return 'Binary data';

    case 'JPEG': return 'Image \u2013 JPEG';
    case 'PNG ': return 'Image \u2013 PNG';
    case 'Rect': return 'Image \u2013 placeholder';
        
    case 'OGGV': return 'Audio \u2013 Ogg';
        
    case 'ZCOD': return 'Game file \u2013 Z-code';
    case 'GLUL': return 'Game file \u2013 Glulx';
    case 'TAD2': return 'Game file \u2013 TADS 2';
    case 'TAD3': return 'Game file \u2013 TADS 3';
    case 'HUGO': return 'Game file \u2013 Hugo';
    case 'ALAN': return 'Game file \u2013 Alan';
    case 'ADRI': return 'Game file \u2013 Adrift';
    case 'LEVE': return 'Game file \u2013 Level 9';
    case 'AGT ': return 'Game file \u2013 AGT';
    case 'MAGS': return 'Game file \u2013 Magnetic Scrolls';
    case 'ADVS': return 'Game file \u2013 AdvSys';
    case 'EXEC': return 'Game file \u2013 Executable';
    }
    
    return 'Unrecognized chunk';
}


export type Blorb = {
    filename: string|undefined;
    chunks: ReadonlyArray<Chunk>;
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
    let newls: Chunk[] = [];
    for (let chunk of blorb.chunks) {
        if (chunk.pos == pos) {
            newls.push(chunk);
        }
        else {
            let newchunk = { ...chunk, pos:pos };
            newls.push(newchunk);
        }
        if (chunk.formtype)
            pos += chunk.data.length;
        else
            pos += (8 + chunk.data.length);
        
        if (pos & 1)
            pos++;
    }
    
    return { ...blorb, chunks:newls, totallen:pos };
}
