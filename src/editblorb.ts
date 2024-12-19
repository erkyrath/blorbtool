import { Chunk, CTypes } from './chunk';
import { new_chunk_Fspc_with, new_chunk_RDes_empty, new_chunk_RDes_with, new_chunk_Reso_with } from './chunk';
import { Blorb } from './blorb';
import { blorb_chunk_for_key, blorb_first_chunk_for_type, blorb_resentry_for_chunk, blorb_resentry_for_key } from './blorb';
import { blorb_clear_errors, blorb_update_index_entries, blorb_delete_chunk_by_key, blorb_addreplace_chunk } from './blorb';
import { check_blorb_consistency } from './checkblorb';

export type BlorbEditCmd = (
    null 
    | { type:'loadnew', blorb:Blorb }
    | { type:'delchunk', refkey:number }
    | { type:'setchunkusage', refkey:number, resid:CTypes.ChunkUsageNumber|undefined }
    | { type:'setfrontis', refkey:number }
    | { type:'setresdesc', usage:CTypes.ChunkUsage, resnum:number, text:string }
    | { type:'delresoentry', resnum:number }
    | { type:'addchunk', chunktype:string, data:Uint8Array }
);

export function blorb_apply_change(blorb: Blorb, act: BlorbEditCmd) : Blorb
{
    if (!act)
        return blorb;

    /* We presume that any edit could fix an error. So we will clear
       the error list and recheck at the end of the change routine. */
    blorb = blorb_clear_errors(blorb);
    
    switch (act.type) {
    case 'loadnew':
        return act.blorb;
    case 'delchunk':
        return blorb_delete_chunk(blorb, act.refkey);
    case 'setchunkusage':
        return blorb_set_chunk_usage(blorb, act.refkey, act.resid);
    case 'setfrontis':
        return blorb_set_frontis(blorb, act.refkey);
    case 'setresdesc':
        return blorb_set_resdesc(blorb, act.usage, act.resnum, act.text);
    case 'delresoentry':
        return blorb_delete_resolution_entry(blorb, act.resnum);
    default:
        console.log('BUG: Unimplemented command', act);
        return blorb;
    }
}

function blorb_delete_chunk(blorb: Blorb, key: number) : Blorb
{
    let resentry = blorb_resentry_for_key(blorb, key);
    
    let newblorb = blorb_delete_chunk_by_key(blorb, key);

    if (resentry) {
        newblorb = blorb_update_usage_refs(newblorb, resentry, undefined);
    }

    newblorb = check_blorb_consistency(newblorb);

    return newblorb;
}

function blorb_set_frontis(blorb: Blorb, key: number) : Blorb
{
    let chunk = blorb.keymap.get(key);
    if (!chunk) {
        console.log('BUG: blorb_set_frontis: no such chunk', key);
        return blorb;
    }
    
    let resentry = blorb_resentry_for_chunk(blorb, chunk);
    if (!resentry) {
        console.log('BUG: blorb_set_frontis: chunk is not resource', key);
        return blorb;
    }
    
    let frontischunk = blorb_first_chunk_for_type(blorb, 'Fspc') as CTypes.CTFrontispiece;
    if (frontischunk && frontischunk.picnum == resentry.resnum) {
        return blorb;
    }

    let newfchunk = new_chunk_Fspc_with(resentry.resnum);
    let newblorb = blorb_addreplace_chunk(blorb, newfchunk);

    newblorb = check_blorb_consistency(newblorb);
    
    return newblorb;
}

function blorb_set_chunk_usage(blorb: Blorb, refkey: number, resid: CTypes.ChunkUsageNumber|undefined) : Blorb
{
    if (!blorb.chunks.length) {
        return blorb;
    }
    
    let oldridx = blorb.chunks[0] as CTypes.CTResIndex;
    if (oldridx.type.stype != 'RIdx') {
        console.log('BUG: blorb_set_chunk_usage: first chunk is not index');
        return blorb;
    }

    let chunk = blorb_chunk_for_key(blorb, refkey);
    if (!chunk) {
        console.log('BUG: blorb_set_chunk_usage: chunk not found');
        return blorb;
    }

    let resentry = blorb_resentry_for_key(blorb, refkey);

    let newents: CTypes.CTResIndexEntry[];
    
    let pos = oldridx.entries.findIndex((ent) => (ent.pos == chunk.pos));
    if (pos < 0) {
        if (!resid) {
            return blorb;
        }
        newents = [ ...oldridx.entries, { usage:resid.usage, resnum:resid.resnum, pos:chunk.pos } ];
    }
    else {
        newents = [ ...oldridx.entries ];
        if (!resid) {
            newents.splice(pos, 1);
        }
        else if (newents[pos].usage == resid.usage && newents[pos].resnum == resid.resnum) {
            return blorb;
        }
        else {
            newents[pos] = { usage:resid.usage, resnum:resid.resnum, pos:chunk.pos };
        }
    }

    let newblorb = blorb_update_index_entries(blorb, newents);

    if (resentry) {
        newblorb = blorb_update_usage_refs(newblorb, resentry, resid);
    }
    
    newblorb = check_blorb_consistency(newblorb);
    
    return newblorb;
}

function blorb_set_resdesc(blorb: Blorb, usage: CTypes.ChunkUsage, resnum: number, text: string) : Blorb
{
    let rdes: CTypes.CTResDescs;
    let errors: string[];
    
    let oldrdes = blorb_first_chunk_for_type(blorb, 'RDes');
    
    if (oldrdes) {
        rdes = oldrdes as CTypes.CTResDescs;
        errors = [];
    }
    else {
        [ rdes, errors ] = new_chunk_RDes_empty() as [ CTypes.CTResDescs, string[] ];
    }

    let newentries: CTypes.CTResDescEntry[];

    let pos = rdes.entries.findIndex((ent) => (ent.usage == usage && ent.resnum == resnum));
    
    if (!text.length) {
        if (pos < 0) {
            // Nothing to delete
            return blorb;
        }
        newentries = [ ...rdes.entries ];
        newentries.splice(pos, 1);
    }
    else {
        if (pos < 0) {
            newentries = [ ...rdes.entries, { usage, resnum, text } ];
        }
        else {
            newentries = [ ...rdes.entries ];
            newentries[pos] = { usage, resnum, text };
        }
    }

    let newblorb: Blorb;
    
    if (!newentries.length) {
        if (oldrdes) {
            newblorb = blorb_delete_chunk_by_key(blorb, oldrdes.refkey);
        }
        else {
            newblorb = blorb;
        }
    }
    else {
        let newrdes = new_chunk_RDes_with(newentries);
        newblorb = blorb_addreplace_chunk(blorb, newrdes);
    }
    
    newblorb = check_blorb_consistency(newblorb);
    
    return newblorb;
}

function blorb_delete_resolution_entry(blorb: Blorb, resnum: number) : Blorb
{
    let reso: CTypes.CTResolution;
    let errors: string[];
    
    let oldreso = blorb_first_chunk_for_type(blorb, 'Reso');
    if (!oldreso)
        return blorb;

    reso = oldreso as CTypes.CTResolution;
    let newentries = reso.entries.filter((ent) => (ent.resnum != resnum));

    let newblorb: Blorb;
    
    if (!newentries) {
        newblorb = blorb_delete_chunk_by_key(blorb, reso.refkey);
    }
    else {
        let newreso = new_chunk_Reso_with(reso.window, newentries);
        newblorb = blorb_addreplace_chunk(blorb, newreso);
    }
    
    newblorb = check_blorb_consistency(newblorb);
    
    return newblorb;
}

function blorb_update_usage_refs(blorb: Blorb, oldresid: CTypes.ChunkUsageNumber, newresid: CTypes.ChunkUsageNumber|undefined) : Blorb
{
    let rdes = blorb_first_chunk_for_type(blorb, 'RDes') as CTypes.CTResDescs;
    if (rdes) {
        let pos = rdes.entries.findIndex((ent) => (ent.usage == oldresid.usage && ent.resnum == oldresid.resnum));
        if (pos >= 0) {
            let newentries: CTypes.CTResDescEntry[];
            if (newresid) {
                newentries = [ ...rdes.entries ];
                newentries[pos] = { usage:newresid.usage, resnum:newresid.resnum, text:rdes.entries[pos].text };
            }
            else {
                newentries = [ ...rdes.entries ];
                newentries.splice(pos, 1);
            }

            if (!newentries.length) {
                blorb = blorb_delete_chunk_by_key(blorb, rdes.refkey);
            }
            else {
                let newrdes = new_chunk_RDes_with(newentries);
                blorb = blorb_addreplace_chunk(blorb, newrdes);
            }
        }
    }

    if (oldresid.usage == 'Pict') {
        let frontischunk = blorb_first_chunk_for_type(blorb, 'Fspc') as CTypes.CTFrontispiece;
        if (frontischunk && frontischunk.picnum == oldresid.resnum) {
            if (newresid && newresid.usage == 'Pict') {
                let newfchunk = new_chunk_Fspc_with(newresid.resnum);
                blorb = blorb_addreplace_chunk(blorb, newfchunk);
            }
            else {
                blorb = blorb_delete_chunk_by_key(blorb, frontischunk.refkey);
            }
        }

        let reso = blorb_first_chunk_for_type(blorb, 'Reso') as CTypes.CTResolution;
        if (reso) {
            let pos = reso.entries.findIndex((ent) => (ent.resnum == oldresid.resnum));
            if (pos >= 0) {
                let newentries: CTypes.CTResolutionEntry[];
                if (newresid && newresid.usage == 'Pict') {
                    newentries = [ ...reso.entries ];
                    newentries[pos] = { ...reso.entries[pos], resnum:newresid.resnum };
                }
                else {
                    newentries = [ ...reso.entries ];
                    newentries.splice(pos, 1);
                }

                if (!newentries.length) {
                    blorb = blorb_delete_chunk_by_key(blorb, reso.refkey);
                }
                else {
                    let newreso = new_chunk_Reso_with(reso.window, newentries);
                    blorb = blorb_addreplace_chunk(blorb, newreso);
                }
            }
        }

    }
    
    return blorb;
}
