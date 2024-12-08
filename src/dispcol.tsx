import React from 'react';
import { useState, useContext } from 'react';

import { u8ToBase64URL } from './datutil';
import { Chunk, Blorb, CTypes } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

import { ChunkCmd, ChunkCmdCtx, SetChunkCmdCtx } from './contexts';
import { DispChunks } from './dispchunk';

export function DisplayColumn({ blorb, selected }: { blorb:Blorb, selected:number })
{
    const [showhex, setShowHex] = useState(false);
    let chunkcmd = useContext(ChunkCmdCtx);
    let setchunkcmd = useContext(SetChunkCmdCtx);

    let selchunk = blorb.chunks.find(chunk => (chunk.reactkey == selected));
    
    function evhan_change(ev: ChangeEv) {
        setShowHex(!showhex);
    }
    function evhan_click_download(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
	setchunkcmd('download');
    }
    function evhan_click_delete(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
	setchunkcmd('delete');
    }

    let cmdpanel = null;
    switch (chunkcmd) {
    case 'download':
	if (selchunk)
	    cmdpanel = <DownloadChunkPanel chunk={selchunk} />;
	break;
    case 'delete':
	if (selchunk)
	    cmdpanel = <DeleteChunkPanel chunk={selchunk} />;
	break;
    }
    
    return (
        <div className="DisplayCol">
            <div className="DisplayHeader">
		<div className="ControlBox">
                    <div className="Control">
			<input id="control_showraw" type="checkbox" checked={ showhex } onChange={ evhan_change } />
			<label htmlFor="control_showraw"> Display hex</label>
                    </div>
                    <div className="Control">
			<button onClick={ evhan_click_download }>Download</button>
                    </div>
                    <div className="Control">
			<button onClick={ evhan_click_delete }>Delete</button>
                    </div>
                </div>
            </div>
            <div className="DisplayPane">
                { (selchunk ?
                   <DisplayChunk blorb={ blorb } chunk={ selchunk } showhex={ showhex } />
                   : null) }
            </div>
	    { cmdpanel }
        </div>
    );
}

function DownloadChunkPanel({ chunk }: { chunk:Chunk })
{
    return (
	<div className="PopPane">
	    <div>Download this chunk...</div>
	</div>
    );
}

function DeleteChunkPanel({ chunk }: { chunk:Chunk })
{
    return (
	<div className="PopPane">
	    <div>Delete this chunk?</div>
	    <button>Cancel</button>
	    <button>Delete</button>
	</div>
    );
}

export function DisplayChunk({ blorb, chunk, showhex }: { blorb:Blorb, chunk:Chunk, showhex:boolean })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;

    if (showhex) {
        display = <DispChunks.DCRaw chunk={ chunk } />
    }
    else {
        switch (chunk.type.stype) {
        case 'RIdx':
            display = <DispChunks.DCResIndex chunk={ chunk as CTypes.CTResIndex } />;
            break;
        case 'Fspc':
            display = <DispChunks.DCFrontispiece chunk={ chunk as CTypes.CTFrontispiece } />;
            break;
        case 'IFmd':
            display = <DispChunks.DCMetadata chunk={ chunk as CTypes.CTMetadata } />;
            break;
        case 'ZCOD':
            display = <DispChunks.DCZCode chunk={ chunk as CTypes.CTZCode } />
            break;
        case 'GLUL':
            display = <DispChunks.DCGlulx chunk={ chunk as CTypes.CTGlulx } />
            break;
        case 'PNG ':
            display = <DispChunks.DCImgPNG chunk={ chunk as CTypes.CTImage } />
            break;
        case 'JPEG':
            display = <DispChunks.DCImgJPEG chunk={ chunk as CTypes.CTImage } />
            break;
        case 'RelN':
            display = <DispChunks.DCReleaseNumber chunk={ chunk as CTypes.CTReleaseNumber } />
            break;
        case 'Reso':
            display = <DispChunks.DCResolution chunk={ chunk as CTypes.CTResolution } />
            break;
        case 'AUTH':
        case 'ANNO':
        case '(c) ':
        case 'SNam':
            display = <DispChunks.DCText chunk={ chunk as CTypes.CTText } />
            break;
        default:
            display = <DispChunks.DCRaw chunk={ chunk } />;
            break;
        }
    }
    
    return (
        <div className="DisplayChunk">
            <h3>
                Chunk:{' '}
                { chunk_readable_desc(chunk) }
            </h3>
            <ul className="InfoList">
                <li><span className="InfoLabel">Type:</span>{' '}
                    <code className="IType">
                        { chunk.type.stype }
                        { chunk.formtype ? ('/'+chunk.formtype.stype) : '' }
                    </code>
                </li>
                { (resentry ?
                   <li><span className="InfoLabel">Usage:</span>{' '}
                       <code className="IType">{ resentry.usage }</code>
                       {' #'}{ resentry.resnum }
                   </li>
                   : null) }
                <li>
                    <span className="InfoLabel">Size:</span>{' '}
                    { pretty_size(chunk.data.length) }
                </li>
                <li>
                    <span className="InfoLabel">File position:</span> { chunk.pos }
                </li>
            </ul>
            { display }
        </div>
    );
}

type ChangeEv = React.ChangeEvent<HTMLInputElement>;
