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
        case 'PNG ':
        case 'JPEG':
            check_chunk_Image(blorb, chunk as CTypes.CTImage, errors);
            break;
        case 'IFmd':
            check_chunk_IFmd(blorb, chunk as CTypes.CTMetadata, errors);
            break;
        case 'Fspc':
            check_chunk_Fspc(blorb, chunk as CTypes.CTFrontispiece, errors);
            break;
        case 'Reso':
            check_chunk_Reso(blorb, chunk as CTypes.CTResolution, errors);
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

function check_chunk_Image(blorb: Blorb, chunk: CTypes.CTImage, errors: string[])
{
    if (!chunk.imgsize) {
        errors.push('Image data not recognized');
    }
}

function check_chunk_IFmd(blorb: Blorb, chunk: CTypes.CTMetadata, errors: string[])
{
    let xmlparser = new DOMParser();
    let xmldoc = xmlparser.parseFromString(chunk.metadata, 'text/xml');

    if (!xmldoc.childNodes.length) {
        errors.push('Metadata chunk has no XML content');
    }
    else {
        let xmlnod = xmldoc.childNodes[0];
        if (xmlnod.nodeName != 'ifindex') {
            errors.push(`Metadata chunk has XML node "${xmlnod.nodeName}", not "ifindex"`);
        }
    }
    
}

function check_chunk_Fspc(blorb: Blorb, chunk: CTypes.CTFrontispiece, errors: string[])
{
    let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', chunk.picnum);
    if (!imgchunk) {
        errors.push(`Frontispiece chunk refers to Pict #${chunk.picnum}, but there is no such resource.`);
    }
}

function check_chunk_Reso(blorb: Blorb, chunk: CTypes.CTResolution, errors: string[])
{
    for (let ent of chunk.entries) {
        let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', ent.resnum);
        if (!imgchunk) {
            errors.push(`Resolution chunk refers to Pict #${ent.resnum}, but there is no such resource.`);
        }
    }
}
