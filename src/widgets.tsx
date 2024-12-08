import React from 'react';
import { useContext } from 'react';

import { blorb_chunk_for_key, chunk_readable_desc } from './blorb';

import { BlorbCtx, SetSelectionCtx } from './contexts';

export function ArrowToChunk({ destkey }: { destkey:number })
{
    let blorb = useContext(BlorbCtx);
    let setSelection = useContext(SetSelectionCtx);

    let chunk = blorb_chunk_for_key(blorb, destkey);
    
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        setSelection(destkey);
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
