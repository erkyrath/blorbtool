import { Chunk } from './chunk';
import { Blorb } from './blorb';

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
    default:
        console.log('### unimplemented command', act);
        return blorb;
    }
}

