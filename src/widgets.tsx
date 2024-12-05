import React from 'react';

export function ArrowToChunk({ destkey }: { destkey:number })
{
    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        console.log('### goto', destkey);
    }

    return (
        <a className="JumpArrow" href="#" onClick={ evhan_click }>&#x279A;</a>
    );
}
