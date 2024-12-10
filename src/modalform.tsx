import React from 'react';
import { useState, useContext } from 'react';

import { ModalForm, ModalFormCtx, SetModalFormCtx } from './contexts';

export function ModalFormOverlay()
{
    let modalform = useContext(ModalFormCtx);
    let setmodalform = useContext(SetModalFormCtx);
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        setmodalform(null);
    }
    
    return (
        <div className="ModalBack" onClick={ evhan_click_background }>
            <div className="ModalBox">
                BOX
            </div>
        </div>
    );
}
