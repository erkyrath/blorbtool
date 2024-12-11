import { u8ToString } from './datutil';
import { u8read4, u8write4 } from './datutil';
import { Chunk, CTypes } from './chunk';

export type Blorb = {
    filename: string|undefined;
    chunks: ReadonlyArray<Chunk>;
    totallen: number;

    // Maps are recomputed whenever the blorb updates.
    usagemap: Map<string, number>; // usage ("Pict:1") to reactkey
    typemap: Map<string, Chunk>; // type ("RIdx") to (first) chunk
    keymap: Map<number, Chunk>; // chunk.reactkey to chunk
    posmap: Map<number, Chunk>; // chunk.pos to chunk

    // Built on load or update.
    errors: ReadonlyArray<string>;
};

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

export function blorb_recompute_positions(blorb: Blorb, oldusagemap?: Map<string, number>) : Blorb
{
    if (blorb.chunks.length == 0)
        return blorb;

    let errors: string[] = [ ...blorb.errors ];
    
    if (blorb.chunks[0].type.stype != 'RIdx') {
        errors.push('First chunk is not a resource index');
        return { ...blorb, errors:errors };
    }
    let ridx = blorb.chunks[0] as CTypes.CTResIndex;

    //### if oldusagemap, pre-length the ridx.data!

    let index = 0;
    let pos = 12;
    let newls: Chunk[] = [];
    let newtypemap: Map<string, Chunk> = new Map();
    let newkeymap: Map<number, Chunk> = new Map();
    let newposmap: Map<number, Chunk> = new Map();

    /* Run through the chunks noting the new positions. (We have to
       clone each chunk to set its new position.)
       While we're at it, we fill in all the cached tables. */
    for (let origchunk of blorb.chunks) {
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

    let newridx: CTypes.CTResIndex;
    
    /* If there is no oldusagemap, we presume the RIdx is correct as-is.
       If there is one, rebuild the RIdx based on it. */
    if (oldusagemap) {
        let newents: CTypes.CTResIndexEntry[] = [];
        let newforusagemap: Map<string, number> = new Map();
        let newinvusagemap: Map<number, CTypes.CTResIndexEntry> = new Map();
        for (let ent of ridx.entries) {
            let usekey = ent.usage+':'+ent.resnum;
            let reactkey = oldusagemap.get(usekey);
            if (reactkey !== undefined) {
                let chunk = newkeymap.get(reactkey);
                if (chunk) {
                    let newent = { usage:ent.usage, resnum:ent.resnum, pos:chunk.pos };
                    newents.push(newent);
                    newforusagemap.set(usekey, chunk.pos);
                    newinvusagemap.set(chunk.pos, newent);
                }
            }
        }
        //### rebuild ridx.data as well
        newridx = { ...ridx, entries:newents, forusagemap:newforusagemap, invusagemap:newinvusagemap };
        newls[0] = newridx;
    }
    else {
        newridx = ridx;
    }

    // And now the usage map, which is based on the (new) RIdx.
    let newusagemap: Map<string, number> = new Map();
    
    for (let [key, pos] of newridx.forusagemap) {
        let chunk = newposmap.get(pos);
        if (chunk)
            newusagemap.set(key, chunk.reactkey);
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

export function blorb_delete_chunk(blorb: Blorb, key: number) : Blorb
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

    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let newchunks = blorb.chunks.filter((chu) => (chu.reactkey != key));
    let newblorb: Blorb = { ...blorb, chunks:newchunks };

    newblorb = blorb_recompute_positions(newblorb, blorb.usagemap);
    
    return newblorb;
}

export function blorb_first_chunk_for_type(blorb: Blorb, type: string) : Chunk|undefined
{
    return blorb.typemap.get(type);
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

