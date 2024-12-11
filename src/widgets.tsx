import React from 'react';
import { useContext } from 'react';

import { Chunk, chunk_readable_desc } from './chunk';
import { blorb_chunk_for_key, blorb_resentry_for_chunk } from './blorb';

import { ReactCtx } from './contexts';

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

