
function stringToU8(str: string) : Uint8Array
{
    return new Uint8Array([ ...str ].map(ch => ch.charCodeAt(0)));
}

function u8ToString(arr: Uint8Array,
    pos: number|undefined, len: number|undefined) : string
{
    if (pos !== undefined || len !== undefined) {
        let rpos = pos || 0;
        if (len === undefined)
            arr = arr.slice(rpos);
        else
            arr = arr.slice(rpos, len);
    }
    return [ ...arr ].map(ch => String.fromCharCode(ch) ).join('');
}

type Chunk = {
    stype: string, // [4]
    utype: Uint8Array, // [4]
    
    data: Uint8Array,
};

type Blorb = {
    chunks: Chunk[];
};

export function new_blorb() : Blorb
{
    return { chunks: [] };
}

export function parse_blorb(dat: Uint8Array) : Blorb
{
    let pos = 0;
    let len = dat.length;
    if (len < 12) {
        console.log('### Too short to be a valid blorb file');
        return new_blorb();
    }

    if (u8ToString(dat, 0, 4) != 'FORM') {
        console.log('### This does not appear to be a valid blorb file');
        return new_blorb();
    }

    let blorb = { chunks: [] };
    console.log('### blorb:', blorb);
    return blorb;
}

