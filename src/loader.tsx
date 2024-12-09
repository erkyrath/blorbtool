import React from 'react';

import { AboutPane } from './about';

export function LoaderIndex()
{
    let filetypes = '.blb,.blorb,.zblorb,.gblorb,.ablorb,application-xblorb';

    function evhan_change(ev: ChangeEv) {
        console.log('### got', ev);
    };
    
    return (
        <div>
            <input type="file" accept={ filetypes } onChange= { evhan_change } />
        </div>
    );
}

export function LoaderDisplay()
{
    return (
        <>
            <div className="DisplayHeader">
            </div>
            <div className="DisplayPane">
                <AboutPane />
            </div>
        </>
    );
}

type ChangeEv = React.ChangeEvent<HTMLInputElement>;
