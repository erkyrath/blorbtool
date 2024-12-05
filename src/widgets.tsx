import React from 'react';
import { useContext } from 'react';

import { SetSelectionCtx } from './contexts';

export function ArrowToChunk({ destkey }: { destkey:number })
{
    let setSelection = useContext(SetSelectionCtx);
    
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        setSelection(destkey);
    }

    return (
        <a className="JumpArrow" href="#" onClick={ evhan_click }>&#x279A;</a>
    );
}
