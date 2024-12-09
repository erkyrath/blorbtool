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
            infile.arrayBuffer().then((arr) => {
                loadblorbfile({
                    filename: infile.name,
                    data: new Uint8Array(arr),
                });
            });
        }
    };

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
                loadblorbfile({
                    filename: infile.name,
                    data: new Uint8Array(arr),
                });
            });
        }
    };
    
    function evhan_dragover(ev: DragEv) {
        ev.stopPropagation();
        ev.preventDefault();
        let el = document.getElementById('dropzone');
        if (el) {
            el.classList.add('Selected');
        }
    };
    
    function evhan_dragenter(ev: DragEv) {
        ev.stopPropagation();
    };
    
    function evhan_dragleave(ev: DragEv) {
        ev.stopPropagation();
        let el = document.getElementById('dropzone');
        if (el) {
            el.classList.remove('Selected');
        }
    };
    
    return (
        <div>
            <h3>BlorbTool</h3>
            <p>Please select a blorb file...</p>
            <div id="dropzone" className="AlignCenter" onDrop={ evhan_drop } onDragOver={ evhan_dragover } onDragEnter={ evhan_dragenter } onDragLeave={ evhan_dragleave }>
                <label className="FileInput" htmlFor="fileinput">Choose File</label>
                <input id="fileinput" type="file" accept={ filetypes } onChange= { evhan_change } />
            </div>
        </div>
    );
}

export function LoaderDisplay()
{
    return (
        <div className="DisplayCol">
            <div className="DisplayHeader">
            </div>
            <div className="DisplayPane">
                <AboutPane />
            </div>
        </div>
    );
}

type ChangeEv = React.ChangeEvent<HTMLInputElement>;
type DragEv = React.DragEvent<HTMLDivElement>;
