import React from 'react';
import { useState, useContext, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Chunk, chunk_readable_desc } from './chunk';
import { Blorb, new_blorb, blorb_get_data } from './blorb';
import { blorb_resentry_for_chunk } from './blorb';
import { parse_blorb, new_blorb_with_index } from './parseblorb';
import { blorb_apply_change } from './editblorb';
import { pretty_size } from './readable';

import { AltDisplay, ModalForm, LoadBlorbAction, ContextContent } from './contexts';
import { ReactCtx, BlorbCtx } from './contexts';
import { DisplayColumn } from './dispcol';
import { LoaderIndex, LoaderDisplay } from './loader';
import { ModalFormOverlay } from './modalform';
import { ArrowDownload, ArrowGeneric } from './widgets';

let initialBlorb: Blorb|undefined;

export function init(blorbdata: Uint8Array|undefined, filename: string|undefined)
{
    if (blorbdata)
        initialBlorb = parse_blorb(blorbdata, filename);
    
    const appel = document.getElementById('appbody') as HTMLElement;
    let root = createRoot(appel);
    if (root)
        root.render( <MyApp /> );
}

function MyApp()
{
    let initialLoader = false;
    if (!initialBlorb) {
        initialBlorb = new_blorb();
        initialLoader = true;
    }
    
    const [blorb, editBlorb] = useReducer(blorb_apply_change, initialBlorb!);
    const [showloader, setShowLoader] = useState(initialLoader);
    const [selected, setSelected] = useState(-1);
    const [altdisplay, setAltDisplay ] = useState(null as AltDisplay);
    const [modalform, setModalForm] = useState(null as ModalForm);

    (window as any).curblorb = blorb; //###
    
    let loadBlorbFile = function(act: LoadBlorbAction) {
        let newblorb: Blorb;
        if (act) {
            newblorb = parse_blorb(act.data, act.filename);
        }
        else {
            newblorb = new_blorb_with_index();
        }
        setShowLoader(false);
        editBlorb({ type:'loadnew', blorb:newblorb });
    }
    
    let setSelectedWrap = function(val: number) {
        if (val != selected) {
            setSelected(val);
            setModalForm(null);
            setAltDisplay(null);
        }
    };
    let setAltDisplayWrap = function(val: AltDisplay) {
        if (val != altdisplay) {
            setSelected(-1);
            setModalForm(null);
            setAltDisplay(val);
        }
    }

    let rctx: ContextContent = {
        selection: selected,
        setSelection: setSelectedWrap,
        altdisplay: altdisplay,
        setAltDisplay: setAltDisplayWrap,
        modalform: modalform,
        setModalForm: setModalForm,
        blorb: blorb,
        loadBlorbFile: loadBlorbFile,
        editBlorb: editBlorb,
    };
    
    return (
        <ReactCtx.Provider value={ rctx }>
        <BlorbCtx.Provider value={ blorb }>
            { showloader ?
              <AppLoading />
              :
              <AppRunning />
            }
        </BlorbCtx.Provider>
        </ReactCtx.Provider>
    );
}

function AppLoading()
{
    return (
        <>
            <IndexColumnBack />
            <LoaderIndex />
            <LoaderDisplay />
        </>
    );
}

function AppRunning()
{
    let rctx = useContext(ReactCtx);
    
    return (
        <>
            <IndexColumnBack />
            <IndexColumn />
            <DisplayColumn selected={ rctx.selection } />
            { (rctx.modalform ? <ModalFormOverlay /> : null) }
        </>
    );
}

function IndexColumn()
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setSelection(-1);
    }
    
    let chunkls = blorb.chunks.map(chunk =>
        <ChunkListEntry key={ chunk.reactkey } chunk={ chunk } isselected={ chunk.reactkey == rctx.selection } />
    );
    
    return (
        <div className="IndexCol" onClick={ evhan_click_background }>
            <BlorbInfoHeader />
            <ul className="ChunkList">
                { chunkls }
            </ul>
        </div>
    );
}

function BlorbInfoHeader()
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;

    if (blorb.chunks.length == 0) {
        return (
            <div className="BlorbInfo">
                <div className="BlorbTitle">(no blorb data is loaded)</div>
            </div>
        );
    }

    function evhan_click_download(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm({ type:'fetchblorb' });
    }

    function evhan_click_errors() {
        rctx.setAltDisplay('errors');
    }

    return (
        <div className="BlorbInfo">
            <div className="BlorbTitle">
                { blorb.filename || '(untitled)' }
            </div>
            <div className="BlorbGloss">
                { blorb.chunks.length } chunks, { pretty_size(blorb.totallen) }
            </div>
            { (blorb.errors.length ? 
               <div className="BlorbInfoErrors">
                   { blorb.errors.length } format errors found
                   {' '}<ArrowGeneric func={ evhan_click_errors } />
               </div>
               : null) }
            <div className="BlorbControls">
                <div className="Control">
                    <button onClick={ evhan_click_download }>Download</button>
                </div>
                <div className="Control">
                    <button>Add Chunk</button>
                </div>
            </div>
        </div>
    );
}

function ChunkListEntry({ chunk, isselected } : { chunk:Chunk, isselected:boolean })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    let resentry = blorb_resentry_for_chunk(blorb, chunk);
    
    function evhan_click(ev: React.MouseEvent<HTMLLIElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setSelection(chunk.reactkey);
    }
    
    return (
        <li className={ isselected ? "Selected" : "" } onClick={ evhan_click }>
            <div className="ChunkType">
                <code className="IType">
                    { chunk.type.stype }
                    { chunk.formtype ? ('/'+chunk.formtype.stype) : '' }
                </code>
                { (resentry ?
                   <>
                       <br />
                       <code className="IType">{ resentry.usage }</code>
                       {' #'}{ resentry.resnum }
                   </>
                   : null) }
            </div>
            <div className="ChunkTitle">{ chunk_readable_desc(chunk) }</div>
            <div className="ChunkGloss">{ pretty_size(chunk.data.length) }</div>
        </li>
    );
}

function IndexColumnBack()
{
    return (
        <div className="IndexColBack">
            <img className="IndexColBackUpper" src="css/index-upper.svg" />
            <img className="IndexColBackLower" src="css/index-lower.svg" />
        </div>
    );
}

