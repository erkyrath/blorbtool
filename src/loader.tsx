import React from 'react';
import { useContext } from 'react';

import { LoadBlorbCtx, LoadBlorbAction } from './contexts';

import { AboutPane } from './about';

export function LoaderIndex()
{
    let loadblorbfile = useContext(LoadBlorbCtx);

    let filetypes = '.blb,.blorb,.zblorb,.gblorb,.ablorb,application-xblorb';

    function evhan_change(ev: ChangeEv) {
        let inputel = document.getElementById('fileinput') as HTMLInputElement;
        if (inputel && inputel.files && inputel.files.length) {
            let infile = inputel.files[0];
            infile.bytes().then((arr) => {
                loadblorbfile({
                    filename: infile.name,
                    data: arr,
                });
            });
        }
    };
    
    return (
        <div>
            <h3>BlorbTool</h3>
            <p>Please select a blorb file...</p>
            <div className="AlignCenter">
                <label className="FileInput" htmlFor="fileinput">Choose File</label>
                <input id="fileinput" type="file" accept={ filetypes } onChange= { evhan_change } />
            </div>
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
