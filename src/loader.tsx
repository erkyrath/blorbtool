import React from 'react';
import { useContext, useRef } from 'react';

import { ReactCtx } from './contexts';

import { AboutPane } from './about';

/* Left column when displaying the upload form. */
export function LoaderIndex()
{
    const inputRef = useRefInput();
    
    let rctx = useContext(ReactCtx);

    let filetypes = '.blb,.blorb,.zblorb,.gblorb,.ablorb,application-xblorb';

    function evhan_click_new(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.loadBlorbFile(undefined);
    }
    
    function evhan_change(ev: ChangeEv) {
        let inputel = inputRef.current;
        if (inputel && inputel.files && inputel.files.length) {
            let infile = inputel.files[0];
            infile.arrayBuffer().then((arr) => {
                rctx.loadBlorbFile({
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
                rctx.loadBlorbFile({
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
        <div id="dropzone" className="IndexCol" onDrop={ evhan_drop } onDragOver={ evhan_dragover } onDragEnter={ evhan_dragenter } onDragLeave={ evhan_dragleave }>
            <h3>BlorbTool</h3>
            <p>Please select a blorb file...</p>
            <div className="AlignCenter">
                <label className="FileInput" htmlFor="fileinput">Choose File</label>
                <input id="fileinput" type="file" accept={ filetypes } onChange= { evhan_change } ref={ inputRef } />
            </div>
            <div className="WhileNotDragging">
                <p>Or you can start editing a with an empty blorb file.</p>
                <div className="AlignCenter">
                    <button onClick={ evhan_click_new }>New Blorb</button>
                </div>
            </div>
            <div className="WhileDragging">
                <p className="AlignCenter">
                    Drop your file here!
                </p>
                <div className="BigArrow">
                    &#x21A7;
                </div>
            </div>
        </div>
    );
}

/* Right pane when displaying the upload form. */
export function LoaderDisplay()
{
    return (
        <div className="DisplayCol">
            <div className="DisplayHeaderBack">
                <img className="DisplayHeaderBackAcross" src="css/disphead-across.svg" />
            </div>
            <div className="DisplayHeader">
            </div>
            <div className="DisplayPane">
                <AboutPane />
            </div>
        </div>
    );
}

// Late typedefs (because my editor gets confused)

type ChangeEv = React.ChangeEvent<HTMLInputElement>;
type DragEv = React.DragEvent<HTMLDivElement>;

const useRefInput = () => useRef<HTMLInputElement>(null);
