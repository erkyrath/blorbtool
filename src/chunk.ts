import { u8ToString, u16ToString, utf8ToString, stringToUtf8, stringToU8 } from './datutil';
import { u8read4, u8write4 } from './datutil';
import { ImageSize, ImageRatio, find_dimensions_png, find_dimensions_jpeg } from './imgutil';
import { Blorb, blorb_resentry_for_chunk } from './blorb';

/* Declarations for the top-level Chunk type and its many derived types.
 */

/* This stores the same four-character type field twice: as a string (for
   printing and comparing), and as a four-byte array (for saving out).
*/
export type ChunkType = {
    stype: string; // four characters
    utype: Uint8Array; // four bytes
}

/* Polymorphous utility: convert a four-character string *or* a four-byte
   array into a ChunkType.
*/
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

// Used to generate the unique refkey values. (We just increment it.)
let keycounter = 1;

/* The Chunk type is a base type. All the chunk types in the CTypes
   namespace (CTResIndex, etc) extend it.

   As with Blorb, all Chunk types are considered immutable.

   We assume that the chunk.type field is correct. That is, we'll cast
   Chunk to CTResIndex if chunk.type is 'RIdx', and so on. There's no
   type-safety here; we have to keep the types straight ourselves.

   (A "tagged struct" idiom would be nicer and allow some compile-time
   checking. But that's not what I did.)
*/

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

    /* A few low-level types first. */

    // The valid usage fields.
    export type ChunkUsage = 'Pict' | 'Snd ' | 'Data' | 'Exec';

    // A usage plus resource number.
    export type ChunkUsageNumber = {
        usage: ChunkUsage;
        resnum: number;
    };

    // Usage, resource number, and position -- one entry in the index chunk.
    export type CTResIndexEntry = {
        usage: ChunkUsage;
        resnum: number;
        pos: number;
    };

    /* The chunks, extending the basic Chunk interface. */
    
    // Chunk type 'RIdx'.
    export interface CTResIndex extends Chunk {
        entries: ReadonlyArray<CTResIndexEntry>;
        forusagemap: Map<string, number>; // "Pict:1" to pos
        invusagemap: Map<number, CTypes.CTResIndexEntry>; // the inverse
    };
    
    // Chunk type 'Fspc'.
    export interface CTFrontispiece extends Chunk {
        picnum: number;
    }

    // One entry in the resource description chunk.
    export type CTResDescEntry = {
        usage: ChunkUsage;
        resnum: number;
        text: string;
    };
    
    // Chunk type 'RDes'.
    export interface CTResDescs extends Chunk {
        entries: ReadonlyArray<CTResDescEntry>;
        usagemap: Map<string, string>; // "Pict:1" to text
    }

    // Chunk type 'IFmd'.
    export interface CTMetadata extends Chunk {
        metadata: string;
    }
    
    // Chunk type 'ZCOD'.
    export interface CTZCode extends Chunk {
        zversion: number;
        release: number;
        serial: string;
    }

    // Chunk type 'GLUL'.
    export interface CTGlulx extends Chunk {
        gversion: string;
        infversion: string;
        release: number;
        serial: string;
    }

    // Chunk types 'PNG ', 'JPEG'.
    export interface CTImage extends Chunk {
        imgsize: ImageSize|undefined;
    }
    
    // Chunk types 'TEXT', 'AUTH', 'ANNO', '(c) ', 'SNam'.
    // Note that the chunk data could have various text encodings. We store
    // the decoded text here, so the struct doesn't have to distinguish.
    // Look at chunk.type when re-encoding.
    export interface CTText extends Chunk {
        text: string;
    }
    
    // Chunk type 'RelN'.
    export interface CTReleaseNumber extends Chunk {
        release: number;
    }

    // The window info in the resolution chunk. (There's only one of these,
    // but it's easier to define it as a type.)
    export type CTResolutionWindow = {
        winsize: ImageSize;
        minwinsize: ImageSize;
        maxwinsize: ImageSize;
    }
    
    // One entry in the resolution chunk.
    export type CTResolutionEntry = {
        resnum: number;
        stdratio: ImageRatio;
        minratio: ImageRatio;
        maxratio: ImageRatio;
    }

    // Chunk type 'Reso'.
    export interface CTResolution extends Chunk {
        window: CTResolutionWindow;
        entries: ReadonlyArray<CTResolutionEntry>;
    }
    
}

/* Given a string, constrain it to a valid usage type or else return
   undefined.
*/
export function StringToUsage(val: string) : CTypes.ChunkUsage|undefined
{
    switch (val) {
    case 'Pict':
    case 'Snd ':
    case 'Data':
    case 'Exec':
        return val;
    default:
        return undefined;
    }
}

/* A lot of these chunk constructors can raise errors, so we have a return
   type for both.
*/
type ChunkWithErrors = [ Chunk, string[] ];

/* Create a chunk of the base class. We only have the type and data (bytes)
   at this point. Also the initial position, if we are loading from a
   file.
*/
function new_chunk_noinit(type:string|Uint8Array, data:Uint8Array, origpos?:number) : Chunk
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
        pos: origpos || 0,
    }

    return chunk;
}

/* Create a chunk from data (bytes). Load up the type-specific contents
   by parsing that data.
*/
export function new_chunk(type:string|Uint8Array, data:Uint8Array, origpos?:number) : ChunkWithErrors
{
    let chunk = new_chunk_noinit(type, data, origpos);

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
    case 'TEXT':
        /* Note that the encoding of a text chunk is not required to be
           UTF-8. We're assuming it is, but the result might look wrong.
           Should we try to guess encoding based on the data? */
        return new_chunk_UTF8Text(chunk);
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

/* Create an empty index chunk. It so happens that an empty index chunk
   has the byte data [0, 0, 0, 0], so it's easiest to do this by
   creating that byte array and then parsing it.
*/
export function new_chunk_RIdx_empty() : ChunkWithErrors
{
    return new_chunk('RIdx', new Uint8Array(4));
}

/* Create an index chunk from data (bytes).
 */
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
        let usagestr = u8ToString(chunk.data, 4 + ix*12, 4);
        let usage = StringToUsage(usagestr);
        let resnum = u8read4(chunk.data, 4 + ix*12 + 4);
        let pos = u8read4(chunk.data, 4 + ix*12 + 8);
        if (!usage) {
            errors.push(`Usage field is invalid: ${usagestr}`);
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

/* Create a frontispiece chunk from data (bytes).
 */
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

/* Create a frontispiece chunk with a given number. Create the data
   to match.
*/
export function new_chunk_Fspc_with(picnum: number) : Chunk
{
    let data = new Uint8Array(4);
    u8write4(data, 0, picnum);
    
    let chunk = new_chunk_noinit('Fspc', data);
    let reschunk : CTypes.CTFrontispiece = { ...chunk, picnum:picnum };
    return reschunk;
}

/* Create a resource description chunk from data (bytes).
 */
function new_chunk_RDes(chunk: Chunk) : ChunkWithErrors
{
    let errors: string[] = [];
    let entries: CTypes.CTResDescEntry[] = [];
    let usagemap: Map<string, string> = new Map();

    let count = u8read4(chunk.data, 0);
    let pos = 4;

    for (let ix=0; ix<count; ix++) {
        let usagestr = u8ToString(chunk.data, pos, 4);
        let usage = StringToUsage(usagestr);
        let resnum = u8read4(chunk.data, pos+4);
        let textlen = u8read4(chunk.data, pos+8);
        let text = utf8ToString(chunk.data.slice(pos+12, pos+12+textlen));
        pos += (12+textlen);
        if (!usage) {
            errors.push(`Usage field is invalid: ${usagestr}`);
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

/* Create a resource description chunk with given entries. Create the data
   to match.
*/
export function new_chunk_RDes_with(entries: CTypes.CTResDescEntry[]) : Chunk
{
    let datals: Uint8Array[] = [];

    let usagemap: Map<string, string> = new Map();
    let len = 4;
    for (let ent of entries) {
        let val = stringToUtf8(ent.text);
        datals.push(val);
        len += 12 + val.length;
        usagemap.set(ent.usage+':'+ent.resnum, ent.text);
    }

    let data = new Uint8Array(len);

    u8write4(data, 0, entries.length);
    let counter = 0;
    let pos = 4;
    for (let ent of entries) {
        let val = datals[counter++];
        data.set(stringToU8(ent.usage), pos);
        u8write4(data, pos+4, ent.resnum);
        u8write4(data, pos+8, val.length);
        pos += 12;
        data.set(val, pos);
        pos += val.length;
    }

    if (pos != len) {
        console.log('BUG: new_chunk_RDes_with got inconsistent length');
    }
    
    let chunk = new_chunk_noinit('RDes', data);
    let reschunk : CTypes.CTResDescs = { ...chunk, entries:entries, usagemap:usagemap };
    return reschunk;
}

/* Create a new empty resource description chunk.
 */
export function new_chunk_RDes_empty() : ChunkWithErrors
{
    return new_chunk('RDes', new Uint8Array(4));
}

/* Create a metadata chunk from data (bytes).
 */
function new_chunk_IFmd(chunk: Chunk) : ChunkWithErrors
{
    let metadata = utf8ToString(chunk.data);
    let reschunk: CTypes.CTMetadata = { ...chunk, metadata:metadata };
    return [ reschunk, [] ];
}

/* Create a Z-code chunk from data (bytes).
 */
function new_chunk_ZCOD(chunk: Chunk) : ChunkWithErrors
{
    let zversion = chunk.data[0];
    let release = 0x100 * chunk.data[2] + chunk.data[3];
    let serial = u8ToString(chunk.data, 18, 6);
    let reschunk: CTypes.CTZCode = { ...chunk, zversion, release, serial };
    return [ reschunk, [] ];
}

/* Create a Glulx chunk from data (bytes).
 */
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

/* Create a PNG image chunk from data (bytes).
 */
function new_chunk_PNG(chunk: Chunk) : ChunkWithErrors
{
    let imgsize = find_dimensions_png(chunk.data);
    let reschunk: CTypes.CTImage = { ...chunk, imgsize:imgsize };
    return [ reschunk, [] ];
}

/* Create a JPEG image chunk from data (bytes).
 */
function new_chunk_JPEG(chunk: Chunk) : ChunkWithErrors
{
    let imgsize = find_dimensions_jpeg(chunk.data);
    let reschunk: CTypes.CTImage = { ...chunk, imgsize:imgsize };
    return [ reschunk, [] ];
}

/* Create a text chunk from data (bytes).
 */
function new_chunk_ASCIIText(chunk: Chunk) : ChunkWithErrors
{
    let text = u8ToString(chunk.data);
    let reschunk: CTypes.CTText = { ...chunk, text:text };
    return [ reschunk, [] ];
}

/* Create a text chunk from data (bytes).
   The encoding is assumed to be UTF-8.
 */
function new_chunk_UTF8Text(chunk: Chunk) : ChunkWithErrors
{
    let text = utf8ToString(chunk.data);
    let reschunk: CTypes.CTText = { ...chunk, text:text };
    return [ reschunk, [] ];
}

/* Create a text chunk from data (bytes).
   The encoding is two-byte characters. This is only used for the
   (deprecated) 'SNam' chunk type.
 */
function new_chunk_U16Text(chunk: Chunk) : ChunkWithErrors
{
    let text = u16ToString(chunk.data);
    let reschunk: CTypes.CTText = { ...chunk, text:text };
    return [ reschunk, [] ];
}

/* Create a release number chunk from data (bytes).
 */
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

/* Create a resolution chunk from data (bytes).
 */
function new_chunk_Reso(chunk: Chunk) : ChunkWithErrors
{
    let winsize = { width:u8read4(chunk.data, 0), height:u8read4(chunk.data, 4) };
    let minwinsize = { width:u8read4(chunk.data, 8), height:u8read4(chunk.data, 12) };
    let maxwinsize = { width:u8read4(chunk.data, 16), height:u8read4(chunk.data, 20) };

    let window: CTypes.CTResolutionWindow = {
        winsize: winsize,
        minwinsize: minwinsize,
        maxwinsize: maxwinsize,
    };
    
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
    
    let reschunk: CTypes.CTResolution = { ...chunk, window:window, entries:entries };
    return [ reschunk, [] ];
}

/* Create a resolution chunk with given entries. Create the data to match.
*/
export function new_chunk_Reso_with(window: CTypes.CTResolutionWindow, entries: CTypes.CTResolutionEntry[]) : Chunk
{
    let len = 24 + 28*entries.length;
    let data = new Uint8Array(len);

    u8write4(data, 0, window.winsize.width);
    u8write4(data, 4, window.winsize.height);
    u8write4(data, 8, window.minwinsize.width);
    u8write4(data, 12, window.minwinsize.height);
    u8write4(data, 16, window.maxwinsize.width);
    u8write4(data, 20, window.maxwinsize.height);

    let pos = 24;
    for (let ent of entries) {
        u8write4(data, pos, ent.resnum);
        u8write4(data, pos+4, ent.stdratio.numerator);
        u8write4(data, pos+8, ent.stdratio.denominator);
        u8write4(data, pos+12, ent.minratio.numerator);
        u8write4(data, pos+16, ent.minratio.denominator);
        u8write4(data, pos+20, ent.maxratio.numerator);
        u8write4(data, pos+24, ent.maxratio.denominator);
        pos += 28;
    }

    let chunk = new_chunk_noinit('Reso', data);
    let reschunk : CTypes.CTResolution = { ...chunk, window:window, entries:entries };
    return reschunk;
}

type ChunkTypeDesc = {
    type: string;
    label: string;
    isform?: boolean;
};

const allChunkTypes: ChunkTypeDesc[] = [
    { type:'RIdx', label:'Resource index' },
    { type:'IFhd', label:'Game identifier' },
    { type:'Fspc', label:'Frontispiece' },
    { type:'RDes', label:'Resource descriptions' },
    { type:'IFmd', label:'Metadata' },

    { type:'TEXT', label:'Text' },
    { type:'BINA', label:'Binary data' },

    { type:'JPEG', label:'Image \u2013 JPEG' },
    { type:'PNG ', label:'Image \u2013 PNG' },
    { type:'Rect', label:'Image \u2013 placeholder' },
        
    { type:'FORM/AIFF', isform:true, label:'Audio \u2013 AIFF' },
    { type:'OGGV', label:'Audio \u2013 Ogg' },
        
    { type:'ZCOD', label:'Game file \u2013 Z-code' },
    { type:'GLUL', label:'Game file \u2013 Glulx' },
    { type:'TAD2', label:'Game file \u2013 TADS 2' },
    { type:'TAD3', label:'Game file \u2013 TADS 3' },
    { type:'HUGO', label:'Game file \u2013 Hugo' },
    { type:'ALAN', label:'Game file \u2013 Alan' },
    { type:'ADRI', label:'Game file \u2013 Adrift' },
    { type:'LEVE', label:'Game file \u2013 Level 9' },
    { type:'AGT ', label:'Game file \u2013 AGT' },
    { type:'MAGS', label:'Game file \u2013 Magnetic Scrolls' },
    { type:'ADVS', label:'Game file \u2013 AdvSys' },
    { type:'EXEC', label:'Game file \u2013 Executable' },

    { type:'AUTH', label:'Author' },
    { type:'(c) ', label:'Copyright message' },
    { type:'ANNO', label:'Annotation' },
    { type:'SNam', label:'Story name (deprecated)' },

    { type:'Plte', label:'Color palette' },
    { type:'RelN', label:'Release number (Z-code)' },
    { type:'Reso', label:'Resolution' },
    { type:'APal', label:'Adaptive palette' },
    { type:'Loop', label:'Audio looping' },
       
];

const chunkTypeMap = new Map(allChunkTypes.map(({ type, label }) => [ type, label ]));

/* Return a human-readable description of a chunk.
 */
export function chunk_readable_desc(chunk: Chunk) : string
{
    if (chunk.formtype) {
        let label = chunkTypeMap.get('FORM/'+chunk.formtype.stype);
        if (label)
            return label;
        return 'Unrecognized form chunk';
    }

    let label = chunkTypeMap.get(chunk.type.stype);
    if (label)
        return label;
    
    return 'Unrecognized chunk';
}

export function selectable_chunk_types() : ChunkTypeDesc[]
{
    // Omit RIdx, which is not selectable
    return allChunkTypes.slice(1);
}

const singletonTypes = new Set([
    'RIdx', 'IFhd', 'Plte', 'Fspc', 'RDes', 'IFmd',
    'RelN', 'Reso', 'APal', 'Loop', 'SNam',
]);

/* Return whether a chunk type is limited to one per blorb file. */
export function chunk_type_is_singleton(chunktype: string) : boolean
{
    return singletonTypes.has(chunktype);
}

/* Return an appropriate filename and mime type for a chunk.
   This is used when downloading the chunk.
*/
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
    case 'TEXT':
    case 'AUTH':
    case 'ANNO':
    case '(c) ':
        mimetype = 'text/plain';
        suffix = '.txt';
        break;
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

