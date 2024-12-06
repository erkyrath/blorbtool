import { u8ToString, stringToU8, u8read4 } from './datutil';
import { ImageSize, find_dimensions_png, find_dimensions_jpeg } from './imgutil';

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

let keycounter = 1;

export interface Chunk {
    // unique identifier for this chunk -- internal use only
    reactkey: number, 

    type: ChunkType,
    formtype: ChunkType|undefined, // set if type is 'FORM'

    data: Uint8Array,

    // These values are recomputed every time the blorb updates.
    index: number,
    pos: number,
};

export namespace CTypes {
    
    type ChunkUsage = 'Pict' | 'Snd ' | 'Data' | 'Exec';
    export type CTResIndexEntry = {
        usage: ChunkUsage,
        resnum: number,
        pos: number,
    };
    
    export interface CTResIndex extends Chunk {
        entries: ReadonlyArray<CTResIndexEntry>,
        usagemap: Map<string, number>; // "Pict:1" to pos
        invusagemap: Map<number, CTypes.CTResIndexEntry>; // the inverse
    };
    
    export interface CTFrontispiece extends Chunk {
        picnum: number;
    }
    
    export interface CTMetadata extends Chunk {
        metadata: string;
    }
    
    export interface CTImage extends Chunk {
        imgsize: ImageSize|undefined;
    }
    
}

export function new_chunk(type:string|Uint8Array, data:Uint8Array) : Chunk
{
    let ctype = make_chunk_type(type);
    
    let formtype: ChunkType|undefined;
    if (ctype.stype === 'FORM') {
        formtype = make_chunk_type(data.slice(8, 12));
    }
    
    let chunk: Chunk = {
        reactkey: keycounter++,
        type: ctype,
        formtype: formtype,
        data: data,
        index: -1,
        pos: 0,
    }

    switch (ctype.stype) {
    case 'RIdx':
        return new_chunk_RIdx(chunk);
    case 'Fspc':
        return new_chunk_Fspc(chunk);
    case 'IFmd':
        return new_chunk_IFmd(chunk);
    case 'PNG ':
        return new_chunk_PNG(chunk);
    case 'JPEG':
        return new_chunk_JPEG(chunk);
    }

    return chunk;
}

function new_chunk_RIdx(chunk: Chunk) : CTypes.CTResIndex
{
    let entries: CTypes.CTResIndexEntry[] = [];
    let usagemap: Map<string, number> = new Map();
    let invusagemap: Map<number, CTypes.CTResIndexEntry> = new Map();

    let count = u8read4(chunk.data, 0);
    if (chunk.data.length != 4 + count*12) {
        console.log('### bad index chunk count');
        return { ...chunk, entries:entries, usagemap:usagemap, invusagemap:invusagemap };
    }

    for (let ix=0; ix<count; ix++) {
        let usage = u8ToString(chunk.data, 4 + ix*12, 4);
        let resnum = u8read4(chunk.data, 4 + ix*12 + 4);
        let pos = u8read4(chunk.data, 4 + ix*12 + 8);
        if (usage != 'Pict' && usage != 'Snd ' && usage != 'Data' && usage != 'Exec') {
            console.log('### bad index entry usage');
            continue;
        }
        let ent: CTypes.CTResIndexEntry = { usage:usage, resnum:resnum, pos:pos };
        entries.push(ent);

        let usekey = usage+':'+resnum;
        usagemap.set(usekey, pos);
        invusagemap.set(pos, ent);
    }

    return { ...chunk, entries:entries, usagemap:usagemap, invusagemap:invusagemap };
}

function new_chunk_Fspc(chunk: Chunk) : CTypes.CTFrontispiece
{
    if (chunk.data.length != 4) {
        console.log('### bad chunk size');
        return { ...chunk, picnum:0 };
    }
    
    let num = u8read4(chunk.data, 0);
    return { ...chunk, picnum:num };
}

function new_chunk_IFmd(chunk: Chunk) : CTypes.CTMetadata
{
    let metadata = u8ToString(chunk.data); //### UTF-8!
    return { ...chunk, metadata:metadata };
}

function new_chunk_PNG(chunk: Chunk) : CTypes.CTImage
{
    let imgsize = find_dimensions_png(chunk.data);
    return { ...chunk, imgsize:imgsize };
}

function new_chunk_JPEG(chunk: Chunk) : CTypes.CTImage
{
    let imgsize = find_dimensions_jpeg(chunk.data);
    return { ...chunk, imgsize:imgsize };
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

    // Maps are recomputed whenever the blorb updates.
    usagemap: Map<string, number>; // "Pict:1" to reactkey
    keymap: Map<number, Chunk>; // chunk.reactkey to chunk
    posmap: Map<number, Chunk>; // chunk.pos to chunk
};

export function new_blorb() : Blorb
{
    return {
        filename: undefined,
        chunks: [],
        totallen: 0,
        usagemap: new Map(),
        keymap: new Map(),
        posmap: new Map(),
    };
}

export function blorb_recompute_positions(blorb: Blorb, oldusagemap?: Map<string, number>) : Blorb
{
    if (blorb.chunks.length == 0)
        return blorb;

    if (blorb.chunks[0].type.stype != 'RIdx') {
        console.log('### first chunk is not an index');
        return blorb;
    }
    let ridx = blorb.chunks[0] as CTypes.CTResIndex;

    //### if oldusagemap, restomp ridx.data!

    let index = 0;
    let pos = 12;
    let newls: Chunk[] = [];
    let newusagemap: Map<string, number> = new Map();
    let newkeymap: Map<number, Chunk> = new Map();
    let newposmap: Map<number, Chunk> = new Map();
    
    for (let origchunk of blorb.chunks) {
        let chunk: Chunk;
        if (origchunk.pos == pos && origchunk.index == index) {
            chunk = origchunk;
        }
        else {
            chunk = { ...origchunk, pos:pos, index:index };
        }
        newls.push(chunk);
        
        newkeymap.set(chunk.reactkey, chunk);
        newposmap.set(chunk.pos, chunk);
        
        if (chunk.formtype)
            pos += chunk.data.length;
        else
            pos += (8 + chunk.data.length);
        
        if (pos & 1)
            pos++;
        index++;
    }

    if (!oldusagemap) {
        for (let [key, pos] of ridx.usagemap) {
            let chunk = newposmap.get(pos);
            if (chunk)
                newusagemap.set(key, chunk.reactkey);
        }
    }
    else {
        let newents: CTypes.CTResIndexEntry[] = [];
        let newusagemap: Map<string, number> = new Map();
        let newinvusagemap: Map<number, CTypes.CTResIndexEntry> = new Map();
        for (let ent of ridx.entries) {
            let usekey = ent.usage+':'+ent.resnum;
            let reactkey = oldusagemap.get(usekey);
            if (reactkey !== undefined) {
                let chunk = newkeymap.get(reactkey);
                if (chunk) {
                    let newent = { usage:ent.usage, resnum:ent.resnum, pos:chunk.pos };
                    newents.push(newent);
                    newusagemap.set(usekey, chunk.reactkey);
                    newinvusagemap.set(chunk.reactkey, newent);
                }
            }
        }
        //### rebuild ridx.data as well
        let newridx = { ...ridx, entries:newents, usagemap:newusagemap, invusagemap:newinvusagemap };
        newls[0] = newridx;
    }
    
    return {
        ...blorb,
        chunks: newls,
        totallen: pos,
        usagemap: newusagemap,
        keymap: newkeymap,
        posmap: newposmap,
    };
}

export function blorb_chunk_for_key(blorb: Blorb, key: number) : Chunk|undefined
{
    return blorb.keymap.get(key);
}

export function blorb_resentry_for_chunk(blorb: Blorb, chunk: Chunk) : CTypes.CTResIndexEntry|undefined
{
    if (blorb.chunks.length == 0 || blorb.chunks[0].type.stype != 'RIdx')
        return undefined;
    
    let ridx = blorb.chunks[0] as CTypes.CTResIndex;
    return ridx.invusagemap.get(chunk.pos);
}

export function blorb_chunk_for_usage(blorb: Blorb, usage: string, resnum: number) : Chunk|undefined
{
    if (blorb.chunks.length == 0 || blorb.chunks[0].type.stype != 'RIdx')
        return undefined;

    let key = usage+':'+resnum;
    let reactkey = blorb.usagemap.get(key);
    if (reactkey !== undefined)
        return blorb.keymap.get(reactkey);
    return undefined;
}

