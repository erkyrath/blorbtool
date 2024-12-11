import React from 'react';
import { useState, useContext } from 'react';

import { chunk_filename_info } from './chunk';
import { blorb_get_data, blorb_chunk_for_key } from './blorb';
import { pretty_size } from './readable';

import { ReactCtx } from './contexts';
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
        modalpane = <ModalFetchChunk reactkey={ modalform.key } />;
        break;
    case 'delchunk':
        modalpane = <ModalDeleteChunk reactkey={ modalform.key } />;
        break;
    default:
        modalpane = <div>###{ modalform.type }</div>;
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
    
    function evhan_click_close(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
    }

    return (
        <>
            <div className="ControlRow">
                <ArrowDownload data={ data } filename={ filename } mimetype={ mimetype } />{' '}
                Download blorb file ({ pretty_size(data.length) })
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ evhan_click_close }>Got it</button>
                </div>
            </div>
        </>
    );
}

function ModalFetchChunk({ reactkey }: { reactkey:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    let chunk = blorb_chunk_for_key(blorb, reactkey);
    if (!chunk)
        return null;
    
    let { filename, mimetype } = chunk_filename_info(chunk, blorb);

    function evhan_click_close(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
    }

    return (
        <>
            <div className="ControlRow">
                <ChunkReadableDesc chunk={ chunk } />
            </div>
            <div className="ControlRow">
                <ArrowDownload data={ chunk.data } filename={ filename } mimetype={ mimetype } />{' '}
                Download this chunk ({ pretty_size(chunk.data.length) })
            </div>
            <div className="ControlRow AlignRight">
                <div className="Control">
                    <button onClick={ evhan_click_close }>Got it</button>
                </div>
            </div>
        </>
    );
}

function ModalDeleteChunk({ reactkey }: { reactkey:number })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    let chunk = blorb_chunk_for_key(blorb, reactkey);
    if (!chunk)
        return null;
    
    function evhan_click_close(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm(null);
    }

    function evhan_click_delete(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.editBlorb({ type:'delchunk', reactkey:reactkey });
        rctx.setModalForm(null);
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
                    <button onClick={ evhan_click_close }>Cancel</button>
                </div>
                <div className="Control">
                    <button onClick={ evhan_click_delete }>Delete</button>
                </div>
            </div>
        </>
    );
}
