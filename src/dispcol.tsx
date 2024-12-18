import React from 'react';
import { useState, useContext, useRef } from 'react';

import { u8ToBase64URL } from './datutil';
import { Chunk, CTypes, StringToUsage } from './chunk';
import { chunk_readable_desc, chunk_filename_info } from './chunk';
import { Blorb, blorb_resentry_for_chunk, blorb_chunk_for_usage } from './blorb';
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
    const [editError, setEditError] = useState('');
    let rctx = useContext(ReactCtx);
    
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
        setEditError('');
        if (!editing)
            setEditingKey(chunk.refkey);
        else
            setEditingKey(-1);
    }

    function evhan_edit_save(resid: CTypes.ChunkUsageNumber|undefined) {
        if (resid) {
            let chu = blorb_chunk_for_usage(blorb, resid.usage, resid.resnum);
            if (chu && chu.refkey != chunk.refkey) {
                setEditError(`A chunk already has usage ${resid.usage} #${resid.resnum}.`);
                return;
            }
        }
        rctx.editBlorb({ type:'setchunkusage', refkey:chunk.refkey, resid:resid });
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
                       <ResEntryEdit chunk={ chunk } resentry={ resentry } error={ editError } onsave={ evhan_edit_save } oncancel={ evhan_edit_usage } />
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

function ResEntryEdit({ chunk, resentry, error, onsave, oncancel }: { chunk:Chunk, resentry:CTypes.CTResIndexEntry|undefined, error:string, onsave:(arg:CTypes.ChunkUsageNumber|undefined) => void, oncancel:() => void })
{
    const inputRef = useRefInput();
    const selectRef = useRefSelect();
    
    let resnum: number = resentry ? resentry.resnum : 0;
    let defaultusage: CTypes.ChunkUsage;

    if (resentry) {
        defaultusage = resentry.usage;
    }
    else {
        switch (chunk.type.stype) {
        case 'JPEG':
        case 'PNG ':
            defaultusage = 'Pict';
            break;
        case 'FORM':
            if (chunk.formtype && chunk.formtype.stype == 'AIFF') {
                defaultusage = 'Snd ';
            }
            else {
                defaultusage = 'Data';
            }
            break;
        case 'ZCOD':
        case 'GLUL':
            defaultusage = 'Exec';
            break;
        default:
            defaultusage = 'Data';
            break;
        }
    }

    function evhan_edit_cancel(ev: MouseButtonEv) {
        oncancel();
    }
    function evhan_edit_save(ev: MouseButtonEv) {
        if (inputRef.current && selectRef.current) {
            let resnum: number = parseInt(inputRef.current.value.trim());
            let usage = StringToUsage(selectRef.current.value);
            if (usage && !Number.isNaN(resnum) && resnum >= 0) {
                onsave({ usage, resnum });
                return;
            }
        }
        onsave(undefined);
    }

    return (
        <>
            <select name="usage" defaultValue={ defaultusage.trim() } ref={ selectRef }>
                <option value="none">(none)</option>
                <option value="Pict">Pict</option>
                <option value="Snd ">Snd </option>
                <option value="Exec">Exec</option>
                <option value="Data">Data</option>
            </select>
            {' '}
            <input id="resnumber" className="ShortTextLine" type="number" min="0" defaultValue={ resnum } placeholder="Number" ref={ inputRef } />
            <div className="ControlRow InlineControls AlignRight">
                <div className="Control">
                    <button onClick={ evhan_edit_cancel }>Cancel</button>
                </div>
                <div className="Control">
                    <button onClick={ evhan_edit_save }>Save</button>
                </div>
            </div>
            { (error ?
               <div className="ControlRow ErrorText AlignRight">
                   { error }
               </div>
               : null) }
        </>
    );
}


// Late typedefs (because my editor gets confused)

type MouseButtonEv = React.MouseEvent<HTMLButtonElement, MouseEvent>;
type ChangeEv = React.ChangeEvent<HTMLInputElement>;
type ErrorArray = ReadonlyArray<Error>;

const useRefInput = () => useRef<HTMLInputElement>(null);
const useRefSelect = () => useRef<HTMLSelectElement>(null);
