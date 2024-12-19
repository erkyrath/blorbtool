
/* Utility functions for dealing with byte arrays. */

/* ASCII (or Latin-1) string to byte array. */
export function stringToU8(str: string) : Uint8Array
{
    return new Uint8Array([ ...str ].map(ch => ch.charCodeAt(0)));
}

/* Byte array to ASCII string. */
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
    return String.fromCharCode.apply(null, [ ...arr ]);
}

/* Byte array to string. We assume the byte array encodes pairs of
   bytes, each pair being a 16-bit character. */
export function u16ToString(arr: Uint8Array)
{
    let chars: number[] = [];
    for (let ix=0; ix<arr.length; ix += 2) {
        chars.push(0x100*arr[ix] + arr[ix+1]);
    }
    return String.fromCharCode.apply(null, chars);
}

/* Byte array to string. We assume the byte array is UTF-8. */
export function utf8ToString(arr: Uint8Array)
{
    let td = new TextDecoder();
    return td.decode(arr);
}

/* String to byte array, UTF-8. */
export function stringToUtf8(str: string) : Uint8Array
{
    let te = new TextEncoder();
    return te.encode(str);
}

/* Read a 32-bit integer from a given location in a byte array. */
export function u8read4(arr: Uint8Array, pos: number) : number
{
    return arr[pos] * 0x1000000 + arr[pos+1] * 0x10000 + arr[pos+2] * 0x100 + arr[pos+3];
}

/* Write a 32-bit integer to a given location in a byte array. */
export function u8write4(arr: Uint8Array, pos: number, val: number)
{
    arr[pos] = (val >>> 24) & 0xFF;
    arr[pos+1] = (val >>> 16) & 0xFF;
    arr[pos+2] = (val >>> 8) & 0xFF;
    arr[pos+3] = (val) & 0xFF;
}

/* Create a data: URL containing a byte array. This is an async function.
   
   We don't actually use this one, but it's so neat that I want to
   keep a copy around!
*/
export function u8ToBase64URL(arr: Uint8Array) : Promise<string|ArrayBuffer|null>
{
    let mimetype = "application/octet-stream";
    return new Promise((resolve, reject) => {
        const reader = Object.assign(new FileReader(), {
            onload: () => resolve(reader.result),
            onerror: () => reject(reader.error),
        });
        reader.readAsDataURL(new File([ arr ], "", { type:mimetype }));
    });
}

/* Quick and dirty check for whether a byte array is probably
   ASCII text. */
export function looksLikeAscii(data: Uint8Array) : boolean
{
    let arr = [ ...data.slice(0, 16) ];
    return arr.every((ch) => {
        return (ch == 10 || ch == 13 || (ch >= 0x20 && ch <= 0x7E));
    });
}
