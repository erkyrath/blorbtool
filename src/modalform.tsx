import React from 'react';
import { useState, useContext } from 'react';

import { chunk_readable_desc, chunk_filename_info } from './chunk';
import { blorb_get_data, blorb_chunk_for_key } from './blorb';
import { pretty_size } from './readable';

import { BlorbCtx } from './contexts';
import { ModalForm, ModalFormCtx, SetModalFormCtx } from './contexts';
import { ArrowDownload} from './widgets';

export function ModalFormOverlay()
{
    let modalform = useContext(ModalFormCtx);
    let setmodalform = useContext(SetModalFormCtx);

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
    default:
        modalpane = <div>###{ modalform.type }</div>;
        break;
    }
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        setmodalform(null);
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
    let blorb = useContext(BlorbCtx);
    let setmodalform = useContext(SetModalFormCtx);

    let filename = 'blorb.blb'; //### from saved filename ### or zblorb/gblorb?
    let mimetype = 'application/x-blorb';

    let data = blorb_get_data(blorb);
    
    function evhan_click_close(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        setmodalform(null);
    }

    return (
        <>
            <div className="ControlRow">
                <ArrowDownload data={ data } filename={ filename } mimetype={ mimetype } />{' '}
                Download blorb file ({ pretty_size(data.length) })
            </div>
            <div className="ControlRow AlignRight">
                <button onClick={ evhan_click_close }>Got it</button>
            </div>
        </>
    );
}

function ModalFetchChunk({ reactkey }: { reactkey:number })
{
    let blorb = useContext(BlorbCtx);
    let chunk = blorb_chunk_for_key(blorb, reactkey);
    if (!chunk)
        return null;
    let setmodalform = useContext(SetModalFormCtx);
    
    let { filename, mimetype } = chunk_filename_info(chunk, blorb);

    function evhan_click_close(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        setmodalform(null);
    }

    return (
        <>
            <div className="ControlRow">
                { chunk_readable_desc(chunk) }
            </div>
            <div className="ControlRow">
                <ArrowDownload data={ chunk.data } filename={ filename } mimetype={ mimetype } />{' '}
                Download this chunk ({ pretty_size(chunk.data.length) })
            </div>
            <div className="ControlRow AlignRight">
                <button onClick={ evhan_click_close }>Got it</button>
            </div>
        </>
    );
}

