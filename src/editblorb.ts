import { Chunk } from './chunk';
import { Blorb } from './blorb';
import { blorb_delete_chunk, blorb_first_chunk_for_type } from './blorb';

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

function blorb_set_frontis(blorb: Blorb, key: number)
{
    let chunk = blorb.keymap.get(key);
    if (!chunk) {
        console.log('BUG: blorb_set_frontis: no such chunk', key);
        return blorb;
    }
    
    let frontischunk = blorb_first_chunk_for_type(blorb, 'Fspc');

    //###
    return blorb;
}
