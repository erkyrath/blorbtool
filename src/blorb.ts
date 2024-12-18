import { u8ToString, stringToU8 } from './datutil';
import { u8read4, u8write4 } from './datutil';
import { Chunk, CTypes } from './chunk';

/* The Blorb type and functions that manipulate it (at a low level).

   A Blorb object is fundamentally a list of chunks, but we keep a bunch
   of lookup tables for fast access. Also a list of errors to display,
   if the current state of the Blorb has errors. The lookup tables
   and errors are rebuilt every time we update the Blorb.
   
   I say "update", but in fact the Blorb object (and all chunk objects)
   are considered *immutable*. We *never* update anything in place. (Not
   even the lookup tables!) The plan is always to create a new object
   with updated contents.

   Happily, JS's spread operator makes this fast and cheap and even easy
   to read. (Since everything is immutable, shallow copies are always
   safe.)

   The immutable plan allows undo/redo to work in a simple way. Of course
   I haven't implemented undo/redo yet. But it's the thought that counts.
 */

/* Slight hack: an error can be a text message *or* a text plus a reference
   to the chunk that caused it. I built a lot of string arrays before
   I thought of this, so I went with this "|" type. */
export type Error = { text:string, refkey:number} | string;

/* The mighty Blorb.

   Remember that a chunk has a unique refkey (an integer) which can
   be used to refer to it. Chunk refkeys are only used in fast
   lookup tables; they are not saved as part of the Blorb.
*/
export type Blorb = {
    filename: string|undefined;
    chunks: ReadonlyArray<Chunk>;
    totallen: number;

    // Maps are recomputed whenever the blorb updates.
    usagemap: Map<string, number>; // usage ("Pict:1") to refkey
    typemap: Map<string, Chunk>; // type ("RIdx") to (first) chunk
    keymap: Map<number, Chunk>; // chunk.refkey to chunk
    posmap: Map<number, Chunk>; // chunk.pos to chunk

    // Built on load or update.
    errors: ReadonlyArray<Error>;
};

/* Return a completely empty Blorb.
   Note that a valid Blorb must contain a resource index chunk (RIdx)
   as its first chunk. This doesn't have that. But we're using this as
   a base to build on, so it's okay as a temporary thing.
*/
export function new_blorb() : Blorb
{
    return {
        filename: undefined,
        chunks: [],
        totallen: 0,
        usagemap: new Map(),
        typemap: new Map(),
        keymap: new Map(),
        posmap: new Map(),
        errors: [],
    };
}

/* Get the byte-array form of a Blorb.
   This is relatively simple because every Chunk keeps *its* byte-array
   form up to date. (Or it should!) So this is mostly a matter of
   concatenating them all.
*/
export function blorb_get_data(blorb: Blorb) : Uint8Array
{
    let data = new Uint8Array(blorb.totallen);

    let pos = 0;

    u8write4(data, pos, 0x464F524D); // "FORM"
    pos += 4;
    u8write4(data, pos, blorb.totallen-8);
    pos += 4;
    u8write4(data, pos, 0x49465253); // "IFRS"
    pos += 4;
    
    for (let chunk of blorb.chunks) {
        if (!chunk.formtype) {
            data.set(chunk.type.utype, pos);
            pos += 4;
            u8write4(data, pos, chunk.data.length);
            pos += 4;
        }
        
        data.set(chunk.data, pos);
        pos += chunk.data.length;
        
        if (pos & 1)
            pos++;
    }

    if (pos != data.length)
        console.log('BUG: blorb_get_data: inconsistent length', pos, data.length);

    return data;
}

/* Recompute the position field of every chunk, and also the position data
   in the index chunk. Also the fast lookup tables.
   
   This is a low-level function; we call this after deleting or modifying
   any chunk. The oldusagemap associates resids ("Pict:1") with chunk
   refkeys. We need this to rebuild the index chunk, whose entries refer
   to chunks by position and are therefore all out of date. (The positions
   all just changed!)

   We also call it after loading a brand-new Blorb from a byte array.
   In that case the position fields and index chunk should already be
   correct (we hope!) so it's just a matter of creating the lookup tables.
   (In this case oldusagemap is not provided, because there is no
   "before loading" and no positions have changed.)
*/
export function blorb_recompute_positions(blorb: Blorb, oldusagemap?: Map<string, number>) : Blorb
{
    if (blorb.chunks.length == 0)
        return blorb;

    let errors: Error[] = [ ...blorb.errors ];
    
    if (blorb.chunks[0].type.stype != 'RIdx') {
        errors.push('First chunk is not a resource index');
        return { ...blorb, errors:errors };
    }
    let ridx = blorb.chunks[0] as CTypes.CTResIndex;

    let origchunksmod = blorb.chunks;

    if (oldusagemap) {
        /* Tricky bit: to compute the positions, the RIdx chunk must be
           the right length. But we're going to alter its data soon.
           Precompute the correct length and stick in some dummy
           data. */
        let keysinuse: Set<number> = new Set();
        for (let origchunk of origchunksmod) {
            keysinuse.add(origchunk.refkey);
        }
        
        let entcount = 0;
        for (let ent of ridx.entries) {
            let usekey = ent.usage+':'+ent.resnum;
            let refkey = oldusagemap.get(usekey);
            if (refkey !== undefined) {
                if (keysinuse.has(refkey)) {
                    entcount++;
                }
            }
        }
        let tempridxdata = new Uint8Array(4 + 12 * entcount);
        ridx = { ...ridx, data:tempridxdata };

        origchunksmod = [ ridx, ...(origchunksmod.slice(1)) ];
    }

    let index = 0;
    let pos = 12;
    let newls: Chunk[] = [];
    let newtypemap: Map<string, Chunk> = new Map();
    let newkeymap: Map<number, Chunk> = new Map();
    let newposmap: Map<number, Chunk> = new Map();

    /* Run through the chunks noting the new positions. (We have to
       clone each chunk to set its new position.)
       While we're at it, we fill in all the cached tables. */
    for (let origchunk of origchunksmod) {
        let chunk: Chunk;
        if (origchunk.pos == pos && origchunk.index == index) {
            chunk = origchunk;
        }
        else {
            chunk = { ...origchunk, pos:pos, index:index };
        }
        newls.push(chunk);

        if (!newtypemap.has(chunk.type.stype))
            newtypemap.set(chunk.type.stype, chunk);
        newkeymap.set(chunk.refkey, chunk);
        newposmap.set(chunk.pos, chunk);
        
        if (chunk.formtype)
            pos += chunk.data.length;
        else
            pos += (8 + chunk.data.length);
        
        if (pos & 1)
            pos++;
        index++;
    }

    /* If there is no oldusagemap, we presume the RIdx is correct as-is.
       If there is one, rebuild the RIdx based on it. */
    if (oldusagemap) {
        let newents: CTypes.CTResIndexEntry[] = [];
        let newforusagemap: Map<string, number> = new Map();
        let newinvusagemap: Map<number, CTypes.CTResIndexEntry> = new Map();
        for (let ent of ridx.entries) {
            let usekey = ent.usage+':'+ent.resnum;
            let refkey = oldusagemap.get(usekey);
            if (refkey !== undefined) {
                let chunk = newkeymap.get(refkey);
                if (chunk) {
                    let newent = { usage:ent.usage, resnum:ent.resnum, pos:chunk.pos };
                    newents.push(newent);
                    newforusagemap.set(usekey, chunk.pos);
                    newinvusagemap.set(chunk.pos, newent);
                }
            }
        }

        newents.sort((ent1, ent2) => (ent1.pos - ent2.pos));
        
        // Rebuild the data (bytes) of ridx so we can save
        let tempridxdata = new Uint8Array(4 + 12 * newents.length);
        let pos = 0;
        u8write4(tempridxdata, pos, newents.length);
        pos += 4;
        for (let ent of newents) {
            tempridxdata.set(stringToU8(ent.usage), pos);
            u8write4(tempridxdata, pos+4, ent.resnum);
            u8write4(tempridxdata, pos+8, ent.pos);
            pos += 12;
        }
        if (tempridxdata.length != ridx.data.length) {
            errors.push(`RIdx: recomputed length does not match estimate (${tempridxdata.length}, ${ridx.data.length})`);
        }
        ridx = { ...ridx, data:tempridxdata };
        
        let newridx: CTypes.CTResIndex = { ...ridx, data:tempridxdata, entries:newents, forusagemap:newforusagemap, invusagemap:newinvusagemap };
        newls[0] = newridx;
        
        ridx = newridx; // for the next step
    }

    // And now the usage map, which is based on the (new) RIdx.
    let newusagemap: Map<string, number> = new Map();
    
    for (let [key, pos] of ridx.forusagemap) {
        let chunk = newposmap.get(pos);
        if (chunk)
            newusagemap.set(key, chunk.refkey);
    }
    
    return {
        ...blorb,
        chunks: newls,
        totallen: pos,
        errors: errors,
        usagemap: newusagemap,
        typemap: newtypemap,
        keymap: newkeymap,
        posmap: newposmap,
    };
}

/* Wipe the error list for a Blorb. (We do this before any modification,
   and then create a new error list afterwards.)
*/
export function blorb_clear_errors(blorb: Blorb) : Blorb
{
    return { ...blorb, errors: [] };
}

/* Update the index chunk with a new list of entries. (Usually this is
   the old list with one entry deleted or modified. But it could be
   more.)
*/
export function blorb_update_index_entries(blorb: Blorb, entries: CTypes.CTResIndexEntry[]) : Blorb
{
    if (blorb.chunks.length == 0)
        return blorb;

    if (blorb.chunks[0].type.stype != 'RIdx') {
        let errors: Error[] = [ ...blorb.errors ];
        errors.push('First chunk is not a resource index');
        return { ...blorb, errors:errors };
    }
    let ridx = blorb.chunks[0] as CTypes.CTResIndex;

    let newusagemap: Map<string, number> = new Map();
    for (let ent of entries) {
        let key = ent.usage+':'+ent.resnum;
        let chu = blorb.posmap.get(ent.pos);
        if (chu)
            newusagemap.set(key, chu.refkey);
    }
    
    let newridx: CTypes.CTResIndex = { ...ridx, entries:entries };
    
    let newchunks = [ newridx, ...blorb.chunks.slice(1) ];
    let newblorb: Blorb = { ...blorb, chunks:newchunks };

    newblorb = blorb_recompute_positions(newblorb, newusagemap);
    
    return newblorb;
}

/* Delete one chunk.
   This is a low-level function; it ensures that the index chunk is
   updated, but it doesn't consider other chunks that might be
   affected. (The resource description chunk, the frontispiece chunk,
   etc -- anything that might refer *to* the deleted chunk.) See
   the function in editblorb.ts for the high-level code that deals
   with this.
 */
export function blorb_delete_chunk_by_key(blorb: Blorb, key: number) : Blorb
{
    let chunk = blorb.keymap.get(key);
    if (!chunk) {
        console.log('BUG: blorb_delete_chunk: no such chunk', key);
        return blorb;
    }
    if (chunk.type.stype == 'RIdx') {
        console.log('BUG: blorb_delete_chunk: cannot delete index');
        return blorb;
    }

    let newchunks = blorb.chunks.filter((chu) => (chu.refkey != key));
    let newblorb: Blorb = { ...blorb, chunks:newchunks };

    /* blorb_recompute_positions() will take care of deleting the
       index chunk reference. */
    newblorb = blorb_recompute_positions(newblorb, blorb.usagemap);
    
    return newblorb;
}

/* Replace a chunk with another of the same type.
   
   This is only meant for singleton chunk types! Don't call it on an
   image chunk, for example. (There could be multiple JPEG chunks in
   the file, and this just replaces the first one. Not what you want.)

   Note that the chunk argument's refkey is updated to match the
   chunk it's replacing.
 */
export function blorb_addreplace_chunk(blorb: Blorb, chunk: Chunk) : Blorb
{

    let pos = blorb.chunks.findIndex((chu) => (chu.type.stype == chunk.type.stype));

    let newblorb: Blorb;
    if (pos < 0) {
        let newchunks = [ ...blorb.chunks, chunk ];
        newblorb = { ...blorb, chunks:newchunks };
    }
    else {
        let oldchunk = blorb.chunks[pos];
        let keyedchunk = { ...chunk, refkey:oldchunk.refkey };
        let newchunks = [ ...blorb.chunks ];
        newchunks[pos] = keyedchunk;
        newblorb = { ...blorb, chunks:newchunks };
    }

    newblorb = blorb_recompute_positions(newblorb, blorb.usagemap);
    
    return newblorb;
}

/* And now, accessors. */

/* First chunk of a given type. This should only be used for singleton
   chunk types.
*/
export function blorb_first_chunk_for_type(blorb: Blorb, type: string) : Chunk|undefined
{
    return blorb.typemap.get(type);
}

/* The chunk with a given refkey. */
export function blorb_chunk_for_key(blorb: Blorb, key: number) : Chunk|undefined
{
    return blorb.keymap.get(key);
}

/* The index chunk entry for a given chunk. (If it is a resource.) */
export function blorb_resentry_for_chunk(blorb: Blorb, chunk: Chunk) : CTypes.CTResIndexEntry|undefined
{
    if (blorb.chunks.length == 0 || blorb.chunks[0].type.stype != 'RIdx')
        return undefined;
    
    let ridx = blorb.chunks[0] as CTypes.CTResIndex;
    return ridx.invusagemap.get(chunk.pos);
}

/* The index chunk entry for a given chunk (by refkey). */
export function blorb_resentry_for_key(blorb: Blorb, key: number) : CTypes.CTResIndexEntry|undefined
{
    let chunk = blorb.keymap.get(key);
    if (!chunk)
        return undefined;
    return blorb_resentry_for_chunk(blorb, chunk);
}

/* The chunk whose index entry matches a given resource usage/number. */
export function blorb_chunk_for_usage(blorb: Blorb, usage: string, resnum: number) : Chunk|undefined
{
    if (blorb.chunks.length == 0 || blorb.chunks[0].type.stype != 'RIdx')
        return undefined;

    let key = usage+':'+resnum;
    let refkey = blorb.usagemap.get(key);
    if (refkey !== undefined)
        return blorb.keymap.get(refkey);
    return undefined;
}

