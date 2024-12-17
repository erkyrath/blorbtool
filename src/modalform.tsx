import React from 'react';
import { useState, useContext } from 'react';

import { chunk_filename_info } from './chunk';
import { blorb_get_data, blorb_chunk_for_key, blorb_resentry_for_key } from './blorb';
import { pretty_size } from './readable';

import { ReactCtx, ContextContent } from './contexts';
import { ArrowDownload, ChunkReadableDesc } from './widgets';

export function ModalFormOverlay()
{
    let rctx = useContext(ReactCtx);
    let modalform = rctx.modalform;

    if (!modalform)
        return null;

    let modalpane = null;
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
    default:
        modalpane = <div>BUG: unimplemented modal: { modalform.type }</div>;
        break;
    }
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
    }
    
    function evhan_click_foreground(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
    }
    
    return (
        <div className="ModalBack" onClick={ evhan_click_background }>
            <div className="ModalBox" onClick={ evhan_click_foreground }>
                { modalpane }
            </div>
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

function evhan_click_close_modal(ev: React.MouseEvent<HTMLElement, MouseEvent>, rctx: ContextContent) {
    ev.stopPropagation();
    rctx.setModalForm(null);
}

