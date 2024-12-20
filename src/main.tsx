import React from 'react';
import { useState, useContext, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Chunk, chunk_readable_desc } from './chunk';
import { Blorb, new_blorb, blorb_get_data } from './blorb';
import { blorb_resentry_for_chunk } from './blorb';
import { parse_blorb, new_blorb_with_index } from './parseblorb';
import { BlorbEditCmd, blorb_apply_change } from './editblorb';
import { pretty_size } from './readable';

import { AltDisplay, ModalForm, LoadBlorbAction, ContextContent } from './contexts';
import { ReactCtx } from './contexts';
import { DisplayColumn } from './dispcol';
import { LoaderIndex, LoaderDisplay } from './loader';
import { ModalFormOverlay } from './modalform';
import { ArrowDownload, ArrowGeneric } from './widgets';

/* BlorbTool: a browser-based Blorb file editor.
 */

/* The initial Blorb data. This can be set when init() is called. If not,
   we'll display a form which allows the user to "upload" a Blorb
   file.
*/
let initialBlorb: Blorb|undefined;
let initialLoader = false;

/* The page setup function. This should be called when the page loads.

   If blorbdata is provided, we parse it into a Blorb object and stash
   it as the initial Blorb to display. (With optional filename attached.)
 */
export function init(blorbdata: Uint8Array|undefined, filename: string|undefined)
{
    //### maybe fix up filename? Remove .js, add .blb
    
    if (blorbdata) {
        initialBlorb = parse_blorb(blorbdata, filename);
        initialLoader = false;
    }
    else {
        initialLoader = true;
    }
    
    const appel = document.getElementById('appbody') as HTMLElement;
    let root = createRoot(appel);
    if (root)
        root.render( <MyApp /> );
}

/* The top-level React component.

   This maintains a bunch of top-level state:

   - The Blorb (updated with a reducer)
   - Flag for whether to display the upload form
   - Which chunk is selected
   - What to display if no chunk is selected
   - A "modal dialog box" (for certain operations)
 */
function MyApp()
{
    const [blorb, editBlorb] = useReducer(blorb_apply_change, initialBlorb!);
    const [showloader, setShowLoader] = useState(initialLoader);
    const [selected, setSelected] = useState(-1);
    const [altdisplay, setAltDisplay ] = useState(null as AltDisplay);
    const [modalform, setModalForm] = useState(null as ModalForm);

    /* In dev mode, store the current Blorb in the global JS environment
       so we can peek at it.
       (Note that this happens every render, not just at startup. So
       it's always the *current* Blorb. 

       Hack alert: we're not running in Node.js here! But the rollup
       configuration replaces "process.env.NODE_ENV" with a static string,
       so we can pretend to check it. */
    if (process.env.NODE_ENV == 'development') {
        (window as any).curblorb = blorb;
    }
    
    let loadBlorbFile = function(act: LoadBlorbAction) {
        /* Parse a byte array into a blorb and set it as current.
           Or, if there is no byte array, create a new empty blorb
           and set *that* as current. */
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
        /* Set the selected chunk while also cancelling any modal
           and alt-display option. */
        if (val != selected) {
            setSelected(val);
            setModalForm(null);
            setAltDisplay(null);
        }
    };
    let setAltDisplayWrap = function(val: AltDisplay) {
        /* Set the alt-display field (whether to display the errors pane,
           etc) while also cancelling any selection and modal. */
        if (val != altdisplay) {
            setSelected(-1);
            setModalForm(null);
            setAltDisplay(val);
        }
    }
    let editBlorbAndSelect = function(cmd: BlorbEditCmd) {
        /* This is a bit of a workaround for React's limitations.
           We might want to add a chunk to a blorb and *also*
           set the current selection to that chunk. But we don't know
           the selection value until the edit operation runs.
           So we call the reducer (just as a function, not as a
           React hook) to generate updated blorb. Then we can peek
           at its stashed "lastadded" value, set the selection,
           and push the new blorb into the reducer hook saying
           "here, use this one, it's already updated".
        */
        let newblorb = blorb_apply_change(blorb, cmd);
        if (newblorb.lastadded !== undefined)
            setSelected(newblorb.lastadded);
        editBlorb({ type:'loadnew', blorb:newblorb });
    }

    /* The whole app is wrapped in a React context. This provides all
       the state and setters used by various components. */
    
    let rctx: ContextContent = {
        selection: selected,
        setSelection: setSelectedWrap,
        showloader: showloader,
        altdisplay: altdisplay,
        setAltDisplay: setAltDisplayWrap,
        modalform: modalform,
        setModalForm: setModalForm,
        blorb: blorb,
        loadBlorbFile: loadBlorbFile,
        editBlorb: editBlorb,
        editBlorbAndSelect: editBlorbAndSelect,
    };
    
    return (
        <ReactCtx.Provider value={ rctx }>
            { showloader ?
              <AppLoading />
              :
              <AppRunning />
            }
        </ReactCtx.Provider>
    );
}

/* The app in its upload-a-Blorb-please state. */
function AppLoading()
{
    return (
        <>
            <IndexColumnBack />
            <LoaderIndex />
            <IndexColFooter />
            <LoaderDisplay />
        </>
    );
}

/* The app in its normal edit-a-Blorb state. */
function AppRunning()
{
    let rctx = useContext(ReactCtx);
    
    return (
        <>
            <IndexColumnBack />
            <IndexColumn />
            <IndexColFooter />
            <DisplayColumn selected={ rctx.selection } />
            { (rctx.modalform ? <ModalFormOverlay /> : null) }
        </>
    );
}

/* The left column. */
function IndexColumn()
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setSelection(-1);
    }
    
    let chunkls = blorb.chunks.map(chunk =>
        <ChunkListEntry key={ chunk.refkey } chunk={ chunk } isselected={ chunk.refkey == rctx.selection } />
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

function IndexColFooter()
{
    let rctx = useContext(ReactCtx);
    
    function evhan_click_help(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        rctx.setAltDisplay('about');
    }
    
    return (
        <div className="IndexColFooter">
            <div className="HelpControl">
                <button className="HelpButton" onClick={ evhan_click_help }>?</button>
            </div>
            <div className="BlorbGloss">
                BlorbTool
            </div>
        </div>
    );
}

/* Blorb info, top of the left column. */
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

    function evhan_click_addchunk(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setModalForm({ type:'addchunk' });
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
                    <button onClick={ evhan_click_addchunk }>Add Chunk</button>
                </div>
            </div>
            <div className="BlorbControls">
                <div className="Control">
                    <button onClick={ evhan_click_download }>Export Blorb</button>
                </div>
            </div>
        </div>
    );
}

/* One entry in the chunk list, left column. */
function ChunkListEntry({ chunk, isselected } : { chunk:Chunk, isselected:boolean })
{
    let rctx = useContext(ReactCtx);
    let blorb = rctx.blorb;
    
    let resentry = blorb_resentry_for_chunk(blorb, chunk);
    
    function evhan_click(ev: React.MouseEvent<HTMLLIElement, MouseEvent>) {
        ev.stopPropagation();
        rctx.setSelection(chunk.refkey);
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

/* Decorative background for the left column. */
function IndexColumnBack()
{
    return (
        <div className="IndexColBack">
            <img className="IndexColBackUpper" src="css/index-upper.svg" />
            <img className="IndexColBackLower" src="css/index-lower.svg" />
        </div>
    );
}

