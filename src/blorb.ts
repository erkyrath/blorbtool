import { u8ToString } from './datutil';
import { u8read4, u8write4 } from './datutil';
import { Chunk, CTypes } from './chunk';

export type Blorb = {
    filename: string|undefined;
    chunks: ReadonlyArray<Chunk>;
    totallen: number;

    // Maps are recomputed whenever the blorb updates.
    usagemap: Map<string, number>; // "Pict:1" to reactkey
    keymap: Map<number, Chunk>; // chunk.reactkey to chunk
    posmap: Map<number, Chunk>; // chunk.pos to chunk

    // Built on load or update.
    errors: ReadonlyArray<string>,
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
        console.log('### bad length?', pos, data.length);

    return data;
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

    //### if oldusagemap, pre-length the ridx.data!

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

