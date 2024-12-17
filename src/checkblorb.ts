import { u8ToString } from './datutil';
import { Chunk, CTypes } from './chunk';
import { Blorb } from './blorb';
import { Error } from './blorb';
import { blorb_chunk_for_usage } from './blorb';

function chunkerr(text: string, chunk: Chunk) : Error
{
    return { text:text, refkey:chunk.refkey };
}

export function check_blorb_against_origpos(blorb: Blorb, origlen: number, map: Map<number, number>) : Blorb
{
    let errors: Error[] = []; // new set of errors
    
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
    let errors: Error[] = []; // new set of errors

    for (let chunk of blorb.chunks) {
        switch (chunk.type.stype) {
        case 'RIdx':
            check_chunk_RIdx(blorb, chunk as CTypes.CTResIndex, errors);
            break;
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

function check_chunk_RIdx(blorb: Blorb, chunk: CTypes.CTResIndex, errors: Error[])
{
    for (let ent of chunk.entries) {
        let chu = blorb.posmap.get(ent.pos);
        if (!chu) {
            errors.push(chunkerr(`Resource index refers to ${ent.usage} #${ent.resnum}, but there is no chunk at ${ent.pos}.`, chunk));
            continue;
        }
        
        if (ent.usage == 'Pict') {
            if (chu.type.stype != 'JPEG' && chu.type.stype != 'PNG ') {
                errors.push(chunkerr(`Resource index refers to ${ent.usage} #${ent.resnum}, but the chunk does not appear to be an image.`, chu));
            }
        }
        if (ent.usage == 'Snd ') {
            if (!(chu.type.stype == 'FORM' && chu.formtype && chu.formtype.stype == 'AIFF')) {
                errors.push(chunkerr(`Resource index refers to ${ent.usage} #${ent.resnum}, but the chunk does not appear to be audio.`, chu));
            }
        }
    }
}

function check_chunk_RDes(blorb: Blorb, chunk: CTypes.CTResDescs, errors: Error[])
{
    let found = new Set();
    
    for (let ent of chunk.entries) {
        let key = ent.usage+':'+ent.resnum;
        if (found.has(key)) {
            errors.push(chunkerr(`Resource description chunk refers to ${ent.usage} #${ent.resnum} more than once.`, chunk));
        }
        found.add(key);
        
        let reschunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);
        if (!reschunk) {
            errors.push(chunkerr(`Resource description chunk refers to ${ent.usage} #${ent.resnum}, but there is no such resource.`, chunk));
        }
    }
}

function check_chunk_Image(blorb: Blorb, chunk: CTypes.CTImage, errors: Error[])
{
    if (!chunk.imgsize) {
        errors.push(chunkerr('Image data not recognized', chunk));
    }
}

function check_chunk_ZCOD(blorb: Blorb, chunk: CTypes.CTZCode, errors: Error[])
{
    if (chunk.data[0] > 8) {
        errors.push(chunkerr(`Z-machine version ${chunk.data[0]} is not valid`, chunk));
    }
}

function check_chunk_GLUL(blorb: Blorb, chunk: CTypes.CTGlulx, errors: Error[])
{
    if (u8ToString(chunk.data, 0, 4) != 'Glul') {
        errors.push(chunkerr('File does not appear to be Glulx', chunk));
    }
}

function check_chunk_IFmd(blorb: Blorb, chunk: CTypes.CTMetadata, errors: Error[])
{
    let xmlparser = new DOMParser();
    let xmldoc = xmlparser.parseFromString(chunk.metadata, 'text/xml');

    if (!xmldoc.childNodes.length) {
        errors.push(chunkerr('Metadata chunk has no XML content', chunk));
    }
    else {
        let xmlnod = xmldoc.childNodes[0];
        if (xmlnod.nodeName != 'ifindex') {
            errors.push(chunkerr(`Metadata chunk has XML node "${xmlnod.nodeName}", not "ifindex"`, chunk));
        }
    }
    
}

function check_chunk_Fspc(blorb: Blorb, chunk: CTypes.CTFrontispiece, errors: Error[])
{
    let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', chunk.picnum);
    if (!imgchunk) {
        errors.push(chunkerr(`Frontispiece chunk refers to Pict #${chunk.picnum}, but there is no such resource.`, chunk));
    }
}

function check_chunk_Reso(blorb: Blorb, chunk: CTypes.CTResolution, errors: Error[])
{
    let found = new Set();
    
    for (let ent of chunk.entries) {
        let key = 'Pict:'+ent.resnum;
        if (found.has(key)) {
            errors.push(chunkerr(`Resolution chunk refers to Pict #${ent.resnum} more than once.`, chunk));
        }
        found.add(key);
        
        let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', ent.resnum);
        if (!imgchunk) {
            errors.push(chunkerr(`Resolution chunk refers to Pict #${ent.resnum}, but there is no such resource.`, chunk));
        }
    }
}
