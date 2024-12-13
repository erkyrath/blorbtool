import { u8ToString, u16ToString, utf8ToString, stringToU8, u8write4 } from './datutil';
import { u8read4 } from './datutil';
import { ImageSize, ImageRatio, find_dimensions_png, find_dimensions_jpeg } from './imgutil';
import { Blorb, blorb_resentry_for_chunk } from './blorb';

export type ChunkType = {
    stype: string; // four characters
    utype: Uint8Array; // four bytes
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
    refkey: number;

    type: ChunkType;
    formtype: ChunkType|undefined, // set if type is 'FORM'

    data: Uint8Array;

    // These values are recomputed every time the blorb updates.
    index: number;
    pos: number;
};

export namespace CTypes {
    
    type ChunkUsage = 'Pict' | 'Snd ' | 'Data' | 'Exec';
    export type CTResIndexEntry = {
        usage: ChunkUsage;
        resnum: number;
        pos: number;
    };
    
    export interface CTResIndex extends Chunk {
        entries: ReadonlyArray<CTResIndexEntry>;
        forusagemap: Map<string, number>; // "Pict:1" to pos
        invusagemap: Map<number, CTypes.CTResIndexEntry>; // the inverse
    };
    
    export interface CTFrontispiece extends Chunk {
        picnum: number;
    }

    export type CTResDescEntry = {
        usage: ChunkUsage;
        resnum: number;
        text: string;
    };
    
    export interface CTResDescs extends Chunk {
        entries: ReadonlyArray<CTResDescEntry>;
        usagemap: Map<string, string>; // "Pict:1" to text
    }

    export interface CTMetadata extends Chunk {
        metadata: string;
    }
    
    export interface CTZCode extends Chunk {
        zversion: number;
        release: number;
        serial: string;
    }
    
    export interface CTGlulx extends Chunk {
        gversion: string;
        infversion: string;
        release: number;
        serial: string;
    }
    
    export interface CTImage extends Chunk {
        imgsize: ImageSize|undefined;
    }
    
    export interface CTText extends Chunk {
        text: string;
    }
    
    export interface CTReleaseNumber extends Chunk {
        release: number;
    }

    export type CTResolutionEntry = {
        resnum: number;
        stdratio: ImageRatio;
        minratio: ImageRatio;
        maxratio: ImageRatio;
    }

    export interface CTResolution extends Chunk {
        winsize: ImageSize;
        minwinsize: ImageSize;
        maxwinsize: ImageSize;
        entries: ReadonlyArray<CTResolutionEntry>;
    }
    
}

type ChunkWithErrors = [ Chunk, string[] ];

function new_chunk_noinit(type:string|Uint8Array, data:Uint8Array) : Chunk
{
    let ctype = make_chunk_type(type);
    
    let formtype: ChunkType|undefined;
    if (ctype.stype === 'FORM') {
        formtype = make_chunk_type(data.slice(8, 12));
    }
    
    let chunk: Chunk = {
        refkey: keycounter++,
        type: ctype,
        formtype: formtype,
        data: data,
        index: -1,
        pos: 0,
    }

    return chunk;
}

export function new_chunk(type:string|Uint8Array, data:Uint8Array) : ChunkWithErrors
{
    let chunk = new_chunk_noinit(type, data);

    switch (chunk.type.stype) {
    case 'RIdx':
        return new_chunk_RIdx(chunk);
    case 'Fspc':
        return new_chunk_Fspc(chunk);
    case 'RDes':
        return new_chunk_RDes(chunk);
    case 'IFmd':
        return new_chunk_IFmd(chunk);
    case 'ZCOD':
        return new_chunk_ZCOD(chunk);
    case 'GLUL':
        return new_chunk_GLUL(chunk);
    case 'PNG ':
        return new_chunk_PNG(chunk);
    case 'JPEG':
        return new_chunk_JPEG(chunk);
    case 'RelN':
        return new_chunk_RelN(chunk);
    case 'Reso':
        return new_chunk_Reso(chunk);
    case 'AUTH':
        return new_chunk_ASCIIText(chunk);
    case 'ANNO':
        return new_chunk_ASCIIText(chunk);
    case '(c) ':
        return new_chunk_ASCIIText(chunk);
    case 'SNam':
        return new_chunk_U16Text(chunk);
    }

    return [ chunk, [] ];
}

export function new_chunk_RIdx_empty() : ChunkWithErrors
{
    return new_chunk('RIdx', new Uint8Array(4));
}

function new_chunk_RIdx(chunk: Chunk) : ChunkWithErrors
{
    let errors: string[] = [];
    let entries: CTypes.CTResIndexEntry[] = [];
    let forusagemap: Map<string, number> = new Map();
    let invusagemap: Map<number, CTypes.CTResIndexEntry> = new Map();

    let count = u8read4(chunk.data, 0);
    if (chunk.data.length != 4 + count*12) {
        errors.push('Bad index chunk count');
        let reschunk: CTypes.CTResIndex = { ...chunk, entries:entries, forusagemap:forusagemap, invusagemap:invusagemap };
        return [ reschunk, errors ];
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
        forusagemap.set(usekey, pos);
        invusagemap.set(pos, ent);
    }

    let reschunk: CTypes.CTResIndex = { ...chunk, entries:entries, forusagemap:forusagemap, invusagemap:invusagemap };
    return [ reschunk, errors ];
}

function new_chunk_Fspc(chunk: Chunk) : ChunkWithErrors
{
    let errors: string[] = [];
    
    if (chunk.data.length != 4) {
        errors.push(`Fspc: bad chunk size (${chunk.data.length} rather than 4)`);
        let reschunk : CTypes.CTFrontispiece = { ...chunk, picnum:0 };
        return [ reschunk, errors ];
    }
    
    let num = u8read4(chunk.data, 0);
    let reschunk : CTypes.CTFrontispiece = { ...chunk, picnum:num };
    return [ reschunk, errors ];
}

export function new_chunk_Fspc_with(picnum: number) : Chunk
{
    let data = new Uint8Array(4);
    u8write4(data, 0, picnum);
    
    let chunk = new_chunk_noinit('Fspc', data);
    let reschunk : CTypes.CTFrontispiece = { ...chunk, picnum:picnum };
    return reschunk;
}

function new_chunk_RDes(chunk: Chunk) : ChunkWithErrors
{
    let errors: string[] = [];
    let entries: CTypes.CTResDescEntry[] = [];
    let usagemap: Map<string, string> = new Map();

    let count = u8read4(chunk.data, 0);
    let pos = 4;

    for (let ix=0; ix<count; ix++) {
        let usage = u8ToString(chunk.data, pos, 4);
        let resnum = u8read4(chunk.data, pos+4);
        let textlen = u8read4(chunk.data, pos+8);
        let text = utf8ToString(chunk.data.slice(pos+12, pos+12+textlen));
        pos += (12+textlen);
        if (usage != 'Pict' && usage != 'Snd ' && usage != 'Data' && usage != 'Exec') {
            console.log('### bad rdes entry usage');
            continue;
        }
        entries.push({ usage, resnum, text });
        usagemap.set(usage+':'+resnum, text);
    }
    
    if (chunk.data.length != pos) {
        errors.push(`RDes: bad chunk size (${chunk.data.length} rather than ${pos})`);
    }
    
    let reschunk : CTypes.CTResDescs = { ...chunk, entries:entries, usagemap:usagemap };
    return [ reschunk, errors ];
}

export function new_chunk_RDes_empty() : ChunkWithErrors
{
    return new_chunk('RDes', new Uint8Array(4));
}

function new_chunk_IFmd(chunk: Chunk) : ChunkWithErrors
{
    let metadata = utf8ToString(chunk.data);
    let reschunk: CTypes.CTMetadata = { ...chunk, metadata:metadata };
    return [ reschunk, [] ];
}

function new_chunk_ZCOD(chunk: Chunk) : ChunkWithErrors
{
    let zversion = chunk.data[0];
    let release = 0x100 * chunk.data[2] + chunk.data[3];
    let serial = u8ToString(chunk.data, 18, 6);
    let reschunk: CTypes.CTZCode = { ...chunk, zversion, release, serial };
    return [ reschunk, [] ];
}

function new_chunk_GLUL(chunk: Chunk) : ChunkWithErrors
{
    let majversion = 0x100 * chunk.data[4] + chunk.data[5];
    let gversion = '' + majversion + '.' + chunk.data[6];
    if (chunk.data[7])
        gversion += chunk.data[7];
    
    let release = 0;
    let serial = '';
    let infversion = '';
    if (u8ToString(chunk.data, 36, 4) == 'Info') {
        if (chunk.data[40] == 0 && chunk.data[41] == 1 && chunk.data[42] == 0 && chunk.data[43] == 0) {
            release = 0x100 * chunk.data[52] + chunk.data[53];
            serial = u8ToString(chunk.data, 54, 6);
            infversion = u8ToString(chunk.data, 44, 4);
        }
    }
    
    let reschunk: CTypes.CTGlulx = { ...chunk, gversion, infversion, release, serial };
    return [ reschunk, [] ];
}

function new_chunk_PNG(chunk: Chunk) : ChunkWithErrors
{
    let imgsize = find_dimensions_png(chunk.data);
    let reschunk: CTypes.CTImage = { ...chunk, imgsize:imgsize };
    return [ reschunk, [] ];
}

function new_chunk_JPEG(chunk: Chunk) : ChunkWithErrors
{
    let imgsize = find_dimensions_jpeg(chunk.data);
    let reschunk: CTypes.CTImage = { ...chunk, imgsize:imgsize };
    return [ reschunk, [] ];
}

function new_chunk_ASCIIText(chunk: Chunk) : ChunkWithErrors
{
    let text = u8ToString(chunk.data);
    let reschunk: CTypes.CTText = { ...chunk, text:text };
    return [ reschunk, [] ];
}

function new_chunk_U16Text(chunk: Chunk) : ChunkWithErrors
{
    let text = u16ToString(chunk.data);
    let reschunk: CTypes.CTText = { ...chunk, text:text };
    return [ reschunk, [] ];
}

function new_chunk_RelN(chunk: Chunk) : ChunkWithErrors
{
    let errors: string[] = [];
    
    if (chunk.data.length != 2) {
        errors.push(`RelN: bad chunk size (${chunk.data.length} rather than 2)`);
        let reschunk: CTypes.CTReleaseNumber = { ...chunk, release:0 };
        return [ reschunk, errors ];
    }
    
    let release = 0x100 * chunk.data[0] + chunk.data[1];
    let reschunk: CTypes.CTReleaseNumber = { ...chunk, release:release };
    return [ reschunk, [] ];
}

function new_chunk_Reso(chunk: Chunk) : ChunkWithErrors
{
    let winsize = { width:u8read4(chunk.data, 0), height:u8read4(chunk.data, 4) };
    let minwinsize = { width:u8read4(chunk.data, 8), height:u8read4(chunk.data, 12) };
    let maxwinsize = { width:u8read4(chunk.data, 16), height:u8read4(chunk.data, 20) };

    let entries: CTypes.CTResolutionEntry[] = [];

    let pos = 24;
    while (pos < chunk.data.length) {
        let ent: CTypes.CTResolutionEntry = {
            resnum: u8read4(chunk.data, pos),
            stdratio: { numerator:u8read4(chunk.data, pos+4), denominator:u8read4(chunk.data, pos+8) },
            minratio: { numerator:u8read4(chunk.data, pos+12), denominator:u8read4(chunk.data, pos+16) },
            maxratio: { numerator:u8read4(chunk.data, pos+20), denominator:u8read4(chunk.data, pos+24) },
        };
        entries.push(ent);
        pos += 28;
    }
    
    let reschunk: CTypes.CTResolution = { ...chunk, winsize:winsize, minwinsize:minwinsize, maxwinsize:maxwinsize, entries:entries };
    return [ reschunk, [] ];
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
    case 'RDes': return 'Resource descriptions';
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

export function chunk_filename_info(chunk: Chunk, blorb: Blorb)
{
    let mimetype;
    let suffix;
    let filename = chunk.type.stype.trim();

    let ent = blorb_resentry_for_chunk(blorb, chunk);
    if (ent) {
        filename = ent.usage.trim() + '-' + ent.resnum;
    }
    
    switch (chunk.type.stype) {
    case 'JPEG':
        mimetype = 'image/jpeg';
        suffix = '.jpeg';
        break;
    case 'PNG ':
        mimetype = 'image/png';
        suffix = '.png';
        break;
    case 'IFmd':
        mimetype = 'text/xml';
        suffix = '.xml';
        break;
    case 'GLUL':
        mimetype = 'application/x-glulx';
        suffix = '.ulx';
        break;
    case 'ZCOD':
        mimetype = 'application/x-zmachine';
        suffix = '.z' + chunk.data[0]; // cheap hack, yes
        break;
    //### others...
    default:
        mimetype = 'application/octet-stream';
        suffix = '.dat';
        break;
    }

    if (chunk.formtype) {
        // Overrides the above
        switch (chunk.formtype.stype) {
        case 'AIFF':
            mimetype = 'audio/aiff';
            suffix = '.aiff';
            break;
        }
    }

    return { filename:filename+suffix, mimetype:mimetype };
}

