import { Chunk } from './chunk';
import { Blorb } from './blorb';
import { blorb_delete_chunk } from './blorb';

export type BlorbEditCmd = (
    null 
    | { type:'loadnew', blorb:Blorb }
    | { type:'delchunk', reactkey:number }
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
    default:
        console.log('### unimplemented command', act);
        return blorb;
    }
}

