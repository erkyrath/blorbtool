import React from 'react';
import { useContext } from 'react';

import { Chunk, chunk_readable_desc } from './chunk';
import { blorb_chunk_for_key, blorb_resentry_for_chunk } from './blorb';

import { ReactCtx } from './contexts';

/* Various React components that get reused a lot. */

/* A one-line chunk description: human-readable label, followed
   by the resource info (if present).
*/
export function ChunkReadableDesc({ chunk }: { chunk:Chunk})
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    let desc = chunk_readable_desc(chunk);
    let resentry = blorb_resentry_for_chunk(blorb, chunk);
    
    return (
        <span>
            { desc }
            { (resentry ?
               <>
                   {' ('}
                   <code className="IType">{ resentry.usage }</code>
                   {' #'}{ resentry.resnum }
                   {')'}
               </>
               : null) }
        </span>
    );
}

/* A clickable arrow that does something. */
export function ArrowGeneric({ func }: { func:()=>void })
{
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        func();
    }

    return (
        <>
            <a className="ForwardArrow" href="#" onClick={ evhan_click }>&#x279C;</a>
        </>
    );
}

/* A clickable arrow that jumps to a chunk. Includes the human-readable
   label. 
*/   
export function ArrowToChunk({ destkey }: { destkey:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;

    let chunk = blorb_chunk_for_key(blorb, destkey);
    
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        rctx.setSelection(destkey);
    }

    return (
        <>
            <a className="JumpArrow" href="#" onClick={ evhan_click }>&#x279A;</a>
            { ( chunk ?
                <span className="JumpGloss">&nbsp; { chunk_readable_desc(chunk) }</span>
                : null) }
        </>
    );
}

/* A clickable arrow that jumps to a chunk. No label. 
*/   
export function ShortArrowToChunk({ destkey }: { destkey:number })
{
    let rctx = useContext(ReactCtx);
    
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        rctx.setSelection(destkey);
    }

    return (
        <>
            <a className="JumpArrow" href="#" onClick={ evhan_click }>&#x279A;</a>
        </>
    );
}

/* A clickable arrow for downloading data.
 */
export function ArrowDownload({ data, filename, mimetype }: { data:Uint8Array, filename:string, mimetype:string })
{
    let dataurl = URL.createObjectURL(
        new Blob([ data ], { type: mimetype })
    );

    return (
        <>
            <a className="DownloadArrow" download={ filename } href={ dataurl }>&#x21A7;</a>
        </>
    );
}

/* A clickable button for editing some chunk element.
 */
export function EditButton({ func }: { func:()=>void })
{
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        func();
    }

    return (
        <>
            <a className="EditButton" href="#" onClick={ evhan_click }>&#x270D;</a>
        </>
    );
}

/* A clickable button for deleting some chunk element.
   (Small inline button, not a full "Delete" button.)
*/
export function DeleteButton({ func }: { func:()=>void })
{
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        func();
    }

    return (
        <>
            <a className="DeleteButton" href="#" onClick={ evhan_click }>&#x2715;</a>
        </>
    );
}

