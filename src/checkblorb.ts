import { Chunk, CTypes } from './chunk';
import { Blorb } from './blorb';
import { blorb_chunk_for_usage } from './blorb';

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

export function check_blorb_consistency(blorb: Blorb) : Blorb
{
    let errors: string[] = []; // new set of errors

    for (let chunk of blorb.chunks) {
        switch (chunk.type.stype) {
        case 'Fspc':
            check_chunk_Fspc(blorb, chunk as CTypes.CTFrontispiece, errors);
            break;
        }
    }

    if (errors.length) {
        blorb = {
            ...blorb,
            errors: [ ...blorb.errors, ...errors ],
        }
    }

    return blorb;
}

function check_chunk_Fspc(blorb: Blorb, chunk: CTypes.CTFrontispiece, errors: string[])
{
    let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', chunk.picnum);
    if (!imgchunk) {
        errors.push(`Frontispiece chunk refers to Pict #${chunk.picnum}, but there is no such resource.`);
    }
}
