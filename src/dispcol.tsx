import React from 'react';
import { useState, useContext, useRef } from 'react';

import { Chunk, CTypes, StringToUsage } from './chunk';
import { chunk_readable_desc, chunk_filename_info } from './chunk';
import { Blorb, blorb_resentry_for_chunk, blorb_chunk_for_usage } from './blorb';
import { Error } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

import { ReactCtx } from './contexts';
import { ShortArrowToChunk, ArrowToChunk, ArrowDownload, EditButton } from './widgets';
import { DisplayChunkRaw, DisplayChunkFormatted } from './dispchunk';
import { AboutPane } from './about';

/* React components for the right-hand pane. */

/* Display the right-hand pane with a specific chunk selected. Or
   some other display, like the errors list or the about text.

   If no chunk is selected but we have errors, we display the errors
   (rather than nothing).
   
   Note that the selection is part of rctx, so I don't really have to
   pass that in as a prop. That's left over from earlier versions
   of the app.
*/
export function DisplayColumn({ selected }: { selected:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;

    let selchunk = blorb.chunks.find(chunk => (chunk.refkey == selected));
    
    function evhan_click_download(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        rctx.setModalForm({ type:'fetchchunk', key:selected });
    }
    function evhan_click_delete(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        rctx.setModalForm({ type:'delchunk', key:selected });
    }
    function evhan_click_help(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        rctx.setAltDisplay('about');
    }
    
    let contentpane = null;
    switch (rctx.altdisplay) {
    case 'about':
        contentpane = <AboutPane />;
        break;
    case 'errors':
        if (blorb.errors.length) {
            contentpane = <DisplayErrors errors={ blorb.errors } />
        }
        break;
    default:
        if (selchunk) {
            contentpane = <DisplayChunk chunk={ selchunk } />
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
                        <button disabled={ !selchunk } onClick={ evhan_click_download }>Download</button>
                    </div>
                    <div className="Control">
                        <button disabled={ !selchunk || selchunk.type.stype=='RIdx' } onClick={ evhan_click_delete }>Delete</button>
                    </div>
                    <div className="Control">
                        <button className="HelpButton" onClick={ evhan_click_help }>?</button>
                    </div>
                </div>
            </div>
            <div className="DisplayPane">
                { contentpane }
            </div>
        </div>
    );
}

/* The errors list in the right-hand pane. */
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

/* Display the right-hand pane with a specific chunk selected. If the
   showhex flag is set (or if we have no explicit display component
   for the chunk type), we display it as raw hex.
*/
export function DisplayChunk({ chunk }: { chunk:Chunk })
{
    const [editingKey, setEditingKey] = useState(-1);
    const [editError, setEditError] = useState('');
    const [showhex, setShowHex] = useState(false);
    
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    let editing = (editingKey == chunk.refkey);
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;

    if (showhex) {
        display = <DisplayChunkRaw chunk={ chunk } />;
    }
    else {
        display = <DisplayChunkFormatted blorb={ blorb} chunk={ chunk } />;
    }

    function evhan_raw_change(ev: ChangeEv) {
        setShowHex(!showhex);
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
                <li>
                    <label htmlFor="control_showraw" className="InfoLabel">Display as hex data:</label>{' '}
                    <input id="control_showraw" type="checkbox" checked={ showhex } onChange={ evhan_raw_change } />
                </li>
            </ul>
            { display }
        </div>
    );
}

/* The bit of the "Usage:" line that shows the usage and resource number.
   (Or a dash, if this is not a resource.)
*/
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

/* The bit of the "Usage:" line that lets you edit the usage and resource
   number.
*/
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
