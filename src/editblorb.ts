import { Chunk } from './chunk';
import { Blorb } from './blorb';

export function blorb_apply_change(blorb: Blorb, act: any) : Blorb
{
    if (act.type == 'load') {
        return act.blorb;
    }
    return blorb;
}

