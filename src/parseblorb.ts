import { u8ToString, u8read4 } from './datutil';
import { Chunk, new_chunk } from './chunk';
import { Blorb, new_blorb } from './blorb';
import { blorb_recompute_positions } from './blorb';

export function parse_blorb(dat: Uint8Array, filename?: string) : Blorb
{
    let pos = 0;
    const len = dat.length;

    let errors = [];
    
    if (len < 12) {
        errors.push(`Too short to be a valid blorb file (${len} bytes)`);
        return { ...new_blorb(), errors:errors };
    }

    if (u8ToString(dat, 0, 4) != 'FORM' || u8ToString(dat, 8, 4) != 'IFRS') {
        errors.push('This does not appear to be a blorb file');
        return { ...new_blorb(), errors:errors };
    }

    let foundlen = u8read4(dat, 4);
    if (foundlen+8 != len) {
        errors.push(`Blorb length field is incorrect (${foundlen+8} rather than ${len})`);
        // continue
    }

    let chunks: Chunk[] = [];
    let origposmap: Map<number, number> = new Map();
    pos = 12;

    while (pos < len) {
        if (pos+8 > len) {
            errors.push(`Blorb data looks truncated (chunk ${chunks.length})`);
            break;
        }
        let uctype = dat.slice(pos, pos+4);
        let ctype = u8ToString(uctype);
        let clen = u8read4(dat, pos+4);
        let cpos = pos;
        pos += 8;

        if (pos+clen > len) {
            errors.push(`Blorb chunk looks truncated (chunk ${chunks.length})`);
            break;
        }

        let chunk: Chunk;
        let chunkerrors: string[];
        if (ctype == 'FORM') {
            let formtype = u8ToString(dat, pos, 4);
            let cdat = dat.slice(cpos, pos+clen);
            [ chunk, chunkerrors ] = new_chunk(uctype, cdat);
        }
        else {
            let cdat = dat.slice(pos, pos+clen);
            [ chunk, chunkerrors ] = new_chunk(uctype, cdat);
        }

        chunks.push(chunk);
        origposmap.set(chunk.reactkey, cpos);

        if (chunkerrors.length) {
            errors = [ ...errors, ...chunkerrors ];
        }

        pos += clen;
        if (pos & 1)
            pos++;
    }

    let blorb: Blorb = {
        ...new_blorb(),
        filename: filename,
        chunks: (chunks as ReadonlyArray<Chunk>),
        totallen: pos,
        errors: errors,
    };

    //### check for consistency errors before we recompute?
    
    blorb = blorb_recompute_positions(blorb);

    errors = []; // new set of errors
    
    for (let chunk of blorb.chunks) {
        let pos = origposmap.get(chunk.reactkey);
        if (pos != chunk.pos) {
            errors.push(`Chunk position was wrong (${pos} rather than ${chunk.pos})`);
        }
    }
    if (blorb.totallen != len) {
        errors.push(`Blorb length was not constructed correctly (${blorb.totallen} rather than ${len})`);
    }

    if (errors.length) {
        blorb = {
            ...blorb,
            errors: [ ...blorb.errors, ...errors ],
        }
    }

    return blorb;
}

