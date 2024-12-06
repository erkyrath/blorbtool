import { u8ToString, u8read4 } from './datutil';
import { Chunk, Blorb, new_chunk, new_blorb } from './blorb';
import { blorb_recompute_positions } from './blorb';

export function parse_blorb(dat: Uint8Array, filename?: string) : Blorb
{
    let pos = 0;
    const len = dat.length;
    
    if (len < 12) {
        console.log('### Too short to be a valid blorb file');
        return new_blorb();
    }

    if (u8ToString(dat, 0, 4) != 'FORM') {
        console.log('### This does not appear to be a valid blorb file');
        return new_blorb();
    }

    let foundlen = u8read4(dat, 4);
    if (foundlen+8 != len) {
        console.log('### Blorb length field is incorrect');
        // continue
    }

    if (u8ToString(dat, 8, 4) != 'IFRS') {
        console.log('### This does not appear to be a valid blorb file');
        return new_blorb();
    }

    let chunks: Chunk[] = [];
    let origposmap: Map<number, number> = new Map();
    pos = 12;

    while (pos < len) {
        if (pos+8 > len) {
            console.log('### Blorb data looks truncated');
            break;
        }
        let uctype = dat.slice(pos, pos+4);
        let ctype = u8ToString(uctype);
        let clen = u8read4(dat, pos+4);
        let cpos = pos;
        pos += 8;

        if (pos+clen > len) {
            console.log('### Blorb chunk looks truncated');
            break;
        }

        let chunk: Chunk;
        if (ctype == 'FORM') {
            let formtype = u8ToString(dat, pos, 4);
            let cdat = dat.slice(cpos, pos+clen);
            chunk = new_chunk(uctype, cdat);
        }
        else {
            let cdat = dat.slice(pos, pos+clen);
            chunk = new_chunk(uctype, cdat);
        }

        chunks.push(chunk);
        origposmap.set(chunk.reactkey, cpos);

        pos += clen;
        if (pos & 1)
            pos++;
    }

    let blorb: Blorb = {
        filename: filename,
        chunks: (chunks as ReadonlyArray<Chunk>),
        totallen: pos,
        usagemap: new Map(),
        keymap: new Map(),
        posmap: new Map(),
    };

    //### check for consistency errors before we recompute?
    
    blorb = blorb_recompute_positions(blorb);

    for (let chunk of blorb.chunks) {
        let pos = origposmap.get(chunk.reactkey);
        if (pos != chunk.pos) {
            console.log('### chunk position was wrong');
        }
    }
    if (blorb.totallen != len) {
        console.log('### inconsistent blorb length');
    }

    return blorb;
}

