import { u8ToString } from './datutil';
import { Chunk, CTypes } from './chunk';
import { Blorb } from './blorb';
import { blorb_chunk_for_usage } from './blorb';

export function check_blorb_against_origpos(blorb: Blorb, origlen: number, map: Map<number, number>) : Blorb
{
    let errors: string[] = []; // new set of errors
    
    for (let chunk of blorb.chunks) {
        let pos = map.get(chunk.refkey);
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
        case 'RDes':
            check_chunk_RDes(blorb, chunk as CTypes.CTResDescs, errors);
            break;
        case 'PNG ':
        case 'JPEG':
            check_chunk_Image(blorb, chunk as CTypes.CTImage, errors);
            break;
        case 'GLUL':
            check_chunk_GLUL(blorb, chunk as CTypes.CTGlulx, errors);
            break;
        case 'ZCOD':
            check_chunk_ZCOD(blorb, chunk as CTypes.CTZCode, errors);
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

function check_chunk_RDes(blorb: Blorb, chunk: CTypes.CTResDescs, errors: string[])
{
    let found = new Set();
    
    for (let ent of chunk.entries) {
        let key = ent.usage+':'+ent.resnum;
        if (found.has(key)) {
            errors.push(`Resource description chunk refers to ${ent.usage} #${ent.resnum} more than once.`);
        }
        found.add(key);
        
        let reschunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);
        if (!reschunk) {
            errors.push(`Resource description chunk refers to ${ent.usage} #${ent.resnum}, but there is no such resource.`);
        }
    }
}

function check_chunk_Image(blorb: Blorb, chunk: CTypes.CTImage, errors: string[])
{
    if (!chunk.imgsize) {
        errors.push('Image data not recognized');
    }
}

function check_chunk_ZCOD(blorb: Blorb, chunk: CTypes.CTZCode, errors: string[])
{
    if (chunk.data[0] > 8) {
        errors.push(`Z-machine version ${chunk.data[0]} is not valid`);
    }
}

function check_chunk_GLUL(blorb: Blorb, chunk: CTypes.CTGlulx, errors: string[])
{
    if (u8ToString(chunk.data, 0, 4) != 'Glul') {
        errors.push('File does not appear to be Glulx');
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
    let found = new Set();
    
    for (let ent of chunk.entries) {
        let key = 'Pict:'+ent.resnum;
        if (found.has(key)) {
            errors.push(`Resolution chunk refers to Pict #${ent.resnum} more than once.`);
        }
        found.add(key);
        
        let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', ent.resnum);
        if (!imgchunk) {
            errors.push(`Resolution chunk refers to Pict #${ent.resnum}, but there is no such resource.`);
        }
    }
}
