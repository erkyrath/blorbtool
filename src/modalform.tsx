import React from 'react';
import { useState, useContext } from 'react';

import { blorb_get_data } from './blorb';
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

    let filename = 'blorb.blb'; //### from saved filename ### or zblorb/gblorb?
    let mimetype = 'application/x-blorb';

    let data = blorb_get_data(blorb);
    
    return (
        <>
            <div className="ControlRow">
                <ArrowDownload data={ data } filename={ filename } mimetype={ mimetype } />{' '}
                Download blorb file ({ pretty_size(data.length) })
            </div>
            <div className="ControlRow AlignRight">
                <button>Got it</button>
            </div>
        </>
    );
}

