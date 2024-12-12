import { Chunk, CTypes } from './chunk';
import { new_chunk_Fspc_with } from './chunk';
import { Blorb } from './blorb';
import { blorb_clear_errors, blorb_delete_chunk_by_key, blorb_addreplace_chunk, blorb_first_chunk_for_type, blorb_resentry_for_chunk } from './blorb';
import { check_blorb_consistency } from './checkblorb';

export type BlorbEditCmd = (
    null 
    | { type:'loadnew', blorb:Blorb }
    | { type:'delchunk', reactkey:number }
    | { type:'setfrontis', reactkey:number }
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
        return blorb_delete_chunk(blorb, act.reactkey);
    case 'setfrontis':
        return blorb_set_frontis(blorb, act.reactkey);
    default:
        console.log('### unimplemented command', act);
        return blorb;
    }
}

function blorb_delete_chunk(blorb: Blorb, key: number) : Blorb
{
    let newblorb = blorb_delete_chunk_by_key(blorb, key);

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
