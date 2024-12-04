
export function stringToU8(str: string) : Uint8Array
{
    return new Uint8Array([ ...str ].map(ch => ch.charCodeAt(0)));
}

export function u8ToString(arr: Uint8Array,
    pos?: number, len?: number) : string
{
    if (pos !== undefined || len !== undefined) {
        let rpos = pos || 0;
        if (len === undefined)
            arr = arr.slice(rpos);
        else
            arr = arr.slice(rpos, rpos+len);
    }
    return [ ...arr ].map(ch => String.fromCharCode(ch) ).join('');
}

export function u8read4(arr: Uint8Array, pos: number) : number
{
    return arr[pos] * 0x1000000 + arr[pos+1] * 0x10000 + arr[pos+2] * 0x100 + arr[pos+3];
}
