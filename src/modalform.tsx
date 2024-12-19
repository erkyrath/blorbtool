import React from 'react';
import { useState, useContext, useRef, useMemo } from 'react';

import { chunk_filename_info } from './chunk';
import { blorb_get_data, blorb_chunk_for_key, blorb_resentry_for_key } from './blorb';
import { pretty_size } from './readable';
import { determine_file_type } from './fileutil';

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
                Download blorb file ({ pretty_size(data.length) })
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
                Download this chunk ({ pretty_size(chunk.data.length) })
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
    /* Get fancy and use useMemo() to build-and-cache the file type info.
       Really, the filename/data props are not going to change, so
       we don't have to do this. But this is a practice project, right? */
    let filetype = useMemo(() => determine_file_type(filename, data), [ filename, data ]);
    
    return (
        <>
            <div className="ControlRow">
                This file seems to be:
            </div>
            <div className="ControlRow">
                { filetype }
            </div>
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
type DragEv = React.DragEvent<HTMLDivElement>;

const useRefInput = () => useRef<HTMLInputElement>(null);

