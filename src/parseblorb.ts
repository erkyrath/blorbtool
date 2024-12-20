import { u8ToString, u8read4 } from './datutil';
import { Chunk, new_chunk, new_chunk_RIdx_empty } from './chunk';
import { Blorb, new_blorb } from './blorb';
import { blorb_recompute_positions } from './blorb';
import { check_blorb_against_origpos, check_blorb_consistency, check_blorb_ridx_positions } from './checkblorb';

export function new_blorb_with_index() : Blorb
{
    let blorb = new_blorb();

    let [ newridx, errors ] = new_chunk_RIdx_empty();
    blorb = { ...blorb, chunks: [ newridx ], errors: errors };

    blorb = blorb_recompute_positions(blorb);

    blorb = check_blorb_consistency(blorb);
    
    return blorb;
}

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
            // Data starts with the 'FORM'/length bytes
            let cdat = dat.slice(cpos, pos+clen);
            [ chunk, chunkerrors ] = new_chunk(uctype, cdat, cpos);
        }
        else {
            // Data starts after the 'FORM'/length bytes
            let cdat = dat.slice(pos, pos+clen);
            [ chunk, chunkerrors ] = new_chunk(uctype, cdat, cpos);
        }

        chunks.push(chunk);
        origposmap.set(chunk.refkey, cpos);

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

    // Check for consistency errors in the RIdx as loaded. (If we don't,
    // the blorb_recompute_positions() call will silently drop them.)
    blorb = check_blorb_ridx_positions(blorb);

    // Fix up the RIdx chunk.
    blorb = blorb_recompute_positions(blorb);

    // Check for inconsistency with the original layout during loading. Nothing should have changed.
    blorb = check_blorb_against_origpos(blorb, len, origposmap);

    blorb = check_blorb_consistency(blorb);
    
    return blorb;
}

