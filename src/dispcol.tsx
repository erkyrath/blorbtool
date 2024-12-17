import React from 'react';
import { useState, useContext } from 'react';

import { u8ToBase64URL } from './datutil';
import { Chunk, CTypes } from './chunk';
import { chunk_readable_desc, chunk_filename_info } from './chunk';
import { Blorb, blorb_resentry_for_chunk } from './blorb';
import { Error } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

import { ReactCtx } from './contexts';
import { ShortArrowToChunk, ArrowToChunk, ArrowDownload, EditButton } from './widgets';
import { DisplayChunkRaw, DisplayChunkFormatted } from './dispchunk';

export function DisplayColumn({ selected }: { selected:number })
{
    const [showhex, setShowHex] = useState(false);

    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;

    let selchunk = blorb.chunks.find(chunk => (chunk.refkey == selected));
    
    function evhan_change(ev: ChangeEv) {
        setShowHex(!showhex);
    }
    function evhan_click_download(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        rctx.setModalForm({ type:'fetchchunk', key:selected });
    }
    function evhan_click_delete(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        rctx.setModalForm({ type:'delchunk', key:selected });
    }

    let contentpane = null;
    switch (rctx.altdisplay) {
    case 'errors':
        if (blorb.errors.length) {
            contentpane = <DisplayErrors errors={ blorb.errors } />
        }
        break;
    default:
        if (selchunk) {
            contentpane = <DisplayChunk blorb={ blorb } chunk={ selchunk } showhex={ showhex } />
        }
        else if (blorb.errors.length) {
            contentpane = <DisplayErrors errors={ blorb.errors } />
        }
    }
    
    return (
        <div className="DisplayCol">
            <div className="DisplayHeaderBack">
                <img className="DisplayHeaderBackAcross" src="css/disphead-across.svg" />
            </div>
            <div className="DisplayHeader">
                <div className="ControlBox">
                    <div className="Control">
                        <input id="control_showraw" type="checkbox" checked={ showhex } onChange={ evhan_change } />
                        <label htmlFor="control_showraw"> Display hex</label>
                    </div>
                    <div className="Control">
                        <button disabled={ !selchunk } onClick={ evhan_click_download }>Download</button>
                    </div>
                    <div className="Control">
                        <button disabled={ !selchunk || selchunk.type.stype=='RIdx' } onClick={ evhan_click_delete }>Delete</button>
                    </div>
                </div>
            </div>
            <div className="DisplayPane">
                { contentpane }
            </div>
        </div>
    );
}

export function DisplayErrors({ errors }: { errors:ErrorArray })
{
    let counter = 0;
    let errls = errors.map((obj) =>
        ( (typeof obj === 'string') ?
          <div className="ErrorLine" key={ counter++ }>
              { obj }
          </div>
          :
          <div className="ErrorLine" key={ counter++ }>
              <ShortArrowToChunk destkey={ obj.refkey } />
              {' '}{ obj.text }
          </div>
        )
    );
    
    return (
        <div>
            <h3>Format errors</h3>
            { errls }
        </div>
    );
}

export function DisplayChunk({ blorb, chunk, showhex }: { blorb:Blorb, chunk:Chunk, showhex:boolean })
{
    const [editingKey, setEditingKey] = useState(-1);
    
    let editing = (editingKey == chunk.refkey);
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;

    if (showhex) {
        display = <DisplayChunkRaw chunk={ chunk } />;
    }
    else {
        display = <DisplayChunkFormatted blorb={ blorb} chunk={ chunk } />;
    }

    function evhan_edit_usage() {
        if (!editing)
            setEditingKey(chunk.refkey);
        else
            setEditingKey(-1);
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
                <li><span className="InfoLabel">Usage:</span>{' '}
                    <EditButton func={ evhan_edit_usage } />{' '}
                    { (editing ?
                       <ResEntryEdit chunk={ chunk } resentry={ resentry } />
                       :
                       <ResEntryLine resentry={ resentry } />
                      ) }
                </li>
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

function ResEntryLine({ resentry }: { resentry:CTypes.CTResIndexEntry|undefined })
{
    if (resentry) {
        return (
            <>
                <code className="IType">{ resentry.usage }</code>
                {' #'}{ resentry.resnum }
            </>
        );
    }
    else {
        return <>&#x2013;</>;
    }
}

function ResEntryEdit({ chunk, resentry }: { chunk:Chunk, resentry:CTypes.CTResIndexEntry|undefined })
{
    let resnum: number = resentry ? resentry.resnum : 0;
    
    return (
        <>
            <input id="restype-Pict" type="radio" name="restype" value="Pict" />
            <label htmlFor="restype-Pict">Pict</label>
            <input id="restype-Snd" type="radio" name="restype" value="Snd " />
            <label htmlFor="restype-Snd">Snd</label>
            <input id="restype-Data" type="radio" name="restype" value="Data" />
            <label htmlFor="restype-Data">Data</label>
            <input id="restype-Exec" type="radio" name="restype" value="Exec" />
            <label htmlFor="restype-Exec">Exec</label>
            <input id="restype-none" type="radio" name="restype" value="none" />
            <label htmlFor="restype-none">&#x2014;</label>
            <input id="resnumber" type="text" defaultValue={ resnum } placeholder="Number" />
        </>
    );
}

type ChangeEv = React.ChangeEvent<HTMLInputElement>;
type ErrorArray = ReadonlyArray<Error>;
