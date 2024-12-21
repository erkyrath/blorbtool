import React from 'react';
import { useState, useContext, useRef, useMemo } from 'react';

import { chunk_filename_info, selectable_chunk_types, chunk_type_is_singleton } from './chunk';
import { blorb_get_data, blorb_chunk_for_key, blorb_resentry_for_key, blorb_first_chunk_for_type } from './blorb';
import { pretty_size } from './readable';
import { u8ToString } from './datutil';
import { determine_file_type, filetype_readable_desc, filetype_to_chunktype } from './fileutil';

import { ReactCtx, ContextContent } from './contexts';
import { ArrowDownload, ChunkReadableDesc } from './widgets';

export function ModalFormOverlay()
{
    let rctx = useContext(ReactCtx);
    let modalform = rctx.modalform;

    if (!modalform)
        return null;

    let modalpane = null;
    let draggable = false;
    
    switch (modalform.type) {
    case 'fetchblorb':
        modalpane = <ModalFetchBlorb />;
        break;
    case 'fetchchunk':
        modalpane = <ModalFetchChunk refkey={ modalform.key } />;
        break;
    case 'delchunk':
        modalpane = <ModalDeleteChunk refkey={ modalform.key } />;
        break;
    case 'changefrontis':
        modalpane = <ModalChangeFrontis oldkey={ modalform.oldkey } refkey={ modalform.key } />;
        break;
    case 'addchunk':
        draggable = true;
        modalpane = <ModalAddChunk />;
        break;
    case 'addchunkthen':
        console.log('### adding file', modalform.filename, 'len', modalform.data.length); //###
        modalpane = <ModalAddChunkThen filename={ modalform.filename } data={ modalform.data } />;
        break;
    default:
        modalpane = <div>BUG: unimplemented modal: { (modalform as any).type }</div>;
        break;
    }
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
    }
    
    function evhan_click_foreground(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
    }


    function evhan_drop(ev: DragEv) {
        ev.preventDefault();

        let infile: File|null = null;
        if (ev.dataTransfer.items && ev.dataTransfer.items.length) {
            infile = ev.dataTransfer.items[0].getAsFile();
        }
        else if (ev.dataTransfer.files && ev.dataTransfer.files.length) {
            infile = ev.dataTransfer.files[0];
        }

        if (infile) {
            infile.arrayBuffer().then((arr) => {
                rctx.setModalForm({
                    type: 'addchunkthen',
                    filename: infile.name,
                    data: new Uint8Array(arr),
                });
            });
        }
    };
    
    function evhan_dragover(ev: DragEv) {
        ev.stopPropagation();
        ev.preventDefault();
        let el = document.getElementById('modalbox');
        if (el) {
            el.classList.add('Selected');
        }
    };
    
    function evhan_dragenter(ev: DragEv) {
        ev.stopPropagation();
    };
    
    function evhan_dragleave(ev: DragEv) {
        ev.stopPropagation();
        let el = document.getElementById('modalbox');
        if (el) {
            el.classList.remove('Selected');
        }
    };
        
    return (
        <div className="ModalBack" onClick={ evhan_click_background }>
            { (!draggable ?
               <div className="ModalBox" onClick={ evhan_click_foreground }>
                   { modalpane }
               </div>
               :
               <div id="modalbox" className="ModalBox" onClick={ evhan_click_foreground } onDrop={ evhan_drop } onDragOver={ evhan_dragover } onDragEnter={ evhan_dragenter } onDragLeave={ evhan_dragleave }>
                   { modalpane }
               </div>
              )}
        </div>
    );
}

function ModalFetchBlorb()
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;

    let filename = blorb.filename || 'blorb.blb';
    let mimetype = 'application/x-blorb';

    let data = blorb_get_data(blorb);
    
    return (
        <>
            <div className="ControlRow">
                Export blorb as file ({ pretty_size(data.length) })
            </div>
            <div className="ControlRow AlignCenter">
                <ArrowDownload data={ data } filename={ filename } mimetype={ mimetype } />{' '}
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ (ev)=>evhan_click_close_modal(ev, rctx) }>Got it</button>
                </div>
            </div>
        </>
    );
}

function ModalFetchChunk({ refkey }: { refkey:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    let chunk = blorb_chunk_for_key(blorb, refkey);
    if (!chunk)
        return null;
    
    let { filename, mimetype } = chunk_filename_info(chunk, blorb);

    return (
        <>
            <div className="ControlRow">
                <ChunkReadableDesc chunk={ chunk } />
            </div>
            <div className="ControlRow">
                Export this chunk ({ pretty_size(chunk.data.length) })
            </div>
            <div className="ControlRow">
                <ArrowDownload data={ chunk.data } filename={ filename } mimetype={ mimetype } />{' '}
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ (ev)=>evhan_click_close_modal(ev, rctx) }>Got it</button>
                </div>
            </div>
        </>
    );
}

function ModalDeleteChunk({ refkey }: { refkey:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    let chunk = blorb_chunk_for_key(blorb, refkey);
    if (!chunk)
        return null;
    
    function evhan_click_delete(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
        rctx.editBlorb({ type:'delchunk', refkey:refkey });
    }

    return (
        <>
            <div className="ControlRow">
                <ChunkReadableDesc chunk={ chunk } />
            </div>
            <div className="ControlRow">
                Delete this chunk?
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ (ev)=>evhan_click_close_modal(ev, rctx) }>Cancel</button>
                </div>
                <div className="Control">
                    <button onClick={ evhan_click_delete }>Delete</button>
                </div>
            </div>
        </>
    );
}

function ModalChangeFrontis({ oldkey, refkey }: { oldkey:number, refkey:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    let resentry = blorb_resentry_for_key(blorb, refkey);
    if (!resentry)
        return null;
    let oldresentry = blorb_resentry_for_key(blorb, oldkey);
    if (!oldresentry)
        return null;

    function evhan_click_change(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
        rctx.editBlorb({ type:'setfrontis', refkey:refkey });
    }

    return (
        <>
            <div className="ControlRow">
                <code className="IType">Pict</code> #{ oldresentry.resnum }
                {' '}is already set as the frontispiece.
            </div>
            <div className="ControlRow">
                Change to{' '}
                <code className="IType">Pict</code> #{ resentry.resnum }?
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ (ev)=>evhan_click_close_modal(ev, rctx) }>Cancel</button>
                </div>
                <div className="Control">
                    <button onClick={ evhan_click_change }>Change</button>
                </div>
            </div>
        </>
    );
}

function ModalAddChunk()
{
    const inputRef = useRefInput();
    let rctx = useContext(ReactCtx);
    
    function evhan_change(ev: ChangeEv) {
        let inputel = inputRef.current;
        if (inputel && inputel.files && inputel.files.length) {
            let infile = inputel.files[0];
            infile.arrayBuffer().then((arr) => {
                rctx.setModalForm({
                    type: 'addchunkthen',
                    filename: infile.name,
                    data: new Uint8Array(arr),
                });
            });
        }
    };
    
    return (
        <>
            <div className="ControlRow">
                Select a file to add as a new chunk...
            </div>
            <div className="ControlRow">
                <label className="FileInput" htmlFor="fileinput">Choose File</label>
                <input id="fileinput" type="file" onChange= { evhan_change } ref={ inputRef } />
            </div>
        </>
    );
}

function ModalAddChunkThen({ filename, data }: { filename:string, data:Uint8Array })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    /* Get fancy and use useMemo() to build-and-cache the file type info.
       Really, the filename/data props are not going to change, so
       we don't have to do this. But this is a practice project, right? */
    let guess = useMemo(() => determine_file_type(filename, data), [ filename, data ]);

    let guesstype = filetype_to_chunktype(guess.filetype);
    let initval = validate(guesstype, data);

    const [editError, setEditError] = useState(initval.error);
    const [canSave, setCanSave] = useState(initval.cansave);
    const [mustReplace, setMustReplace] = useState(initval.mustreplace);
    const selectRef = useRefSelect();
    
    let chunkls = selectable_chunk_types().map((obj) => {
        let val = (obj.isform ? obj.type.slice(5) : obj.type);
        return (
            <option key={ obj.type } value={ obj.type }>{ val }: { obj.label }</option>
        );
    });

    //### replace as a UI concept

    function validate(chunktype: string, data: Uint8Array) : { cansave:boolean, mustreplace:boolean, error:string } {
        if (chunktype.length > 4) {
            let formtype = u8ToString(data, 8, 4);
            if (!chunktype.startsWith('FORM') || chunktype.slice(5) != formtype) {
                return { cansave:false, mustreplace:false, error:`This file does not appear to be ${chunktype}.` };
            }
            chunktype = 'FORM';
        }
        if (chunk_type_is_singleton(chunktype) && blorb_first_chunk_for_type(blorb, chunktype)) {
            return { cansave:true, mustreplace:true, error:`A chunk of type ${chunktype} already exists.` };
        }
        return { cansave:true, mustreplace:false, error:'' };
    }
    
    function evhan_select_change(ev: ChangeSelectEv) {
        if (selectRef.current) {
            let chunktype = selectRef.current.value;
            console.log('### menu select', chunktype);
            let { cansave, mustreplace, error } = validate(chunktype, data);
            setEditError(error);
            setCanSave(cansave);
            setMustReplace(mustreplace);
        }
    }
    
    function evhan_click_add(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        if (selectRef.current) {
            let chunktype = selectRef.current.value;
            if (chunktype.length > 4) {
                let formtype = u8ToString(data, 8, 4);
                chunktype = 'FORM';
            }
            rctx.setModalForm(null);
            console.log('### adding chunktype', chunktype, data);
            rctx.editBlorbAndSelect({ type:'addchunk', chunktype:chunktype, data:data });
        }
    }
    
    return (
        <>
            <div className="ControlRow">
                This file seems to be:{' '}
                { filetype_readable_desc(guess.filetype) }
            </div>
            { (guess.alttype ?
               <div className="ControlRow">
                   Or maybe:{' '}
                   { filetype_readable_desc(guess.alttype) }
               </div>
               : null) }
            { (guess.filetype == 'IFRS' ?
               <div className="ControlRow ErrorText">
                   (Putting a blorb chunk in a blorb file is probably a mistake.)
               </div>
               : null) }
            <div className="ControlRow">
                Chunk type:{' '}
                <select name="chunktype" defaultValue={ guesstype } onChange={ evhan_select_change } ref={ selectRef }>
                    { chunkls }
                </select>
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ (ev)=>evhan_click_close_modal(ev, rctx) }>Cancel</button>
                </div>
                <div className="Control">
                    <button disabled={ !canSave } onClick={ evhan_click_add }>{ mustReplace ? "Replace" : "Add" }</button>
                </div>
            </div>
            { (editError ?
               <div className="ControlRow ErrorText AlignRight">
                   { editError }
               </div>
               : null) }
        </>
    );
}

/* Utility function to close the modal. */
function evhan_click_close_modal(ev: React.MouseEvent<HTMLElement, MouseEvent>, rctx: ContextContent) {
    ev.stopPropagation();
    rctx.setModalForm(null);
}

// Late typedefs (because my editor gets confused)

type ChangeEv = React.ChangeEvent<HTMLInputElement>;
type ChangeSelectEv = React.ChangeEvent<HTMLSelectElement>;
type DragEv = React.DragEvent<HTMLDivElement>;

const useRefInput = () => useRef<HTMLInputElement>(null);
const useRefSelect = () => useRef<HTMLSelectElement>(null);

