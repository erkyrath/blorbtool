import { Chunk } from './chunk';
import { Blorb } from './blorb';

export function check_blorb_against_origpos(blorb: Blorb, origlen: number, map: Map<number, number>) : Blorb
{
    let errors: string[] = []; // new set of errors
    
    for (let chunk of blorb.chunks) {
        let pos = map.get(chunk.reactkey);
        if (pos != chunk.pos) {
            errors.push(`Chunk position was wrong (${pos} rather than ${chunk.pos})`);
        }
    }
    if (blorb.totallen != origlen) {
        errors.push(`Blorb length was not constructed correctly (${blorb.totallen} rather than ${origlen})`);
    }

    if (errors.length) {
        blorb = {
            ...blorb,
            errors: [ ...blorb.errors, ...errors ],
        }
    }

    return blorb;
}
