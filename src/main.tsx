import React from 'react';
import { useState, useContext, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Chunk, chunk_readable_desc } from './chunk';
import { Blorb, new_blorb, blorb_get_data } from './blorb';
import { blorb_resentry_for_chunk } from './blorb';
import { parse_blorb } from './parseblorb';
import { pretty_size } from './readable';

import { BlorbCtx, LoadBlorbCtx, LoadBlorbAction } from './contexts';
import { SelectionCtx, SetSelectionCtx } from './contexts';
import { ChunkCmd, ChunkCmdCtx, SetChunkCmdCtx } from './contexts';
import { BlorbCmd, BlorbCmdCtx, SetBlorbCmdCtx } from './contexts';
import { AltDisplay, AltDisplayCtx, SetAltDisplayCtx } from './contexts';
import { DisplayColumn } from './dispcol';
import { LoaderIndex, LoaderDisplay } from './loader';
import { ArrowDownload, ArrowGeneric } from './widgets';

let initialBlorb: Blorb|undefined;

export function init(blorbdata: Uint8Array|undefined)
{
    if (blorbdata)
        initialBlorb = parse_blorb(blorbdata);
    
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
    
    const [blorb, dispBlorb] = useReducer(reduceBlorb, initialBlorb!);
    const [showloader, setShowLoader] = useState(initialLoader);
    const [selected, setSelected] = useState(-1);
    const [altdisplay, setAltDisplay ] = useState(null as AltDisplay);
    const [chunkcmd, setChunkCmd] = useState(null as ChunkCmd);
    const [blorbcmd, setBlorbCmd] = useState(null as BlorbCmd);

    (window as any).curblorb = blorb; //###
    
    let loadBlorbFile = function(act: LoadBlorbAction) {
        console.log('### load', act);
        let newblorb = parse_blorb(act.data, act.filename);
        setShowLoader(false);
        dispBlorb({ type:'load', blorb:newblorb });
    }
    
    let setSelectedWrap = function(val: number) {
        if (val != selected) {
            setSelected(val);
            setChunkCmd(null);
            setAltDisplay(null);
        }
    };
    let setAltDisplayWrap = function(val: AltDisplay) {
        if (val != altdisplay) {
            setSelected(-1);
            setChunkCmd(null);
            setAltDisplay(val);
        }
    }
    
    return (
        <SetSelectionCtx.Provider value={ setSelectedWrap }>
        <SelectionCtx.Provider value={ selected }>
        <SetAltDisplayCtx.Provider value={ setAltDisplayWrap }>
        <AltDisplayCtx.Provider value={ altdisplay }>
        <SetChunkCmdCtx.Provider value={ setChunkCmd }>
        <ChunkCmdCtx.Provider value={ chunkcmd }>
        <SetBlorbCmdCtx.Provider value={ setBlorbCmd }>
        <BlorbCmdCtx.Provider value={ blorbcmd }>
        <LoadBlorbCtx.Provider value={ loadBlorbFile }>
        <BlorbCtx.Provider value={ blorb }>
            { showloader ?
              <AppLoading />
              :
              <AppRunning />
            }
        </BlorbCtx.Provider>
        </LoadBlorbCtx.Provider>
        </BlorbCmdCtx.Provider>
        </SetBlorbCmdCtx.Provider>
        </ChunkCmdCtx.Provider>
        </SetChunkCmdCtx.Provider>
        </AltDisplayCtx.Provider>
        </SetAltDisplayCtx.Provider>
        </SelectionCtx.Provider>
        </SetSelectionCtx.Provider>
    );
}

function AppLoading()
{
    return (
        <>
            <div className="IndexCol">
                <LoaderIndex />
            </div>
            <div className="DisplayCol">
                <LoaderDisplay />
            </div>
        </>
    );
}

function AppRunning()
{
    let blorb = useContext(BlorbCtx);
    let selected = useContext(SelectionCtx);
    let setSelection = useContext(SetSelectionCtx);
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        setSelection(-1);
    }
    
    let chunkls = blorb.chunks.map(chunk =>
        <ChunkListEntry key={ chunk.reactkey } chunk={ chunk } isselected={ chunk.reactkey == selected } />
    );

    return (
        <>
            <div className="IndexCol" onClick={ evhan_click_background }>
                <BlorbInfoHeader />
                <ul className="ChunkList">
                    { chunkls }
                </ul>
            </div>
            <div className="DisplayCol">
                <DisplayColumn selected={ selected } />
            </div>
        </>
    );
}

function BlorbInfoHeader()
{
    let blorb = useContext(BlorbCtx);
    let blorbcmd = useContext(BlorbCmdCtx);
    let setblorbcmd = useContext(SetBlorbCmdCtx);
    let setchunkcmd = useContext(SetChunkCmdCtx);
    let setaltdisplay = useContext(SetAltDisplayCtx);

    if (blorb.chunks.length == 0) {
        return (
            <div className="BlorbInfo">
                <div className="BlorbTitle">(no blorb data is loaded)</div>
            </div>
        );
    }

    function evhan_click_download(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.stopPropagation();
        setchunkcmd(null);
        if (blorbcmd != 'download')
            setblorbcmd('download');
        else
            setblorbcmd(null);
    }

    function evhan_click_errors() {
        setaltdisplay('errors');
    }

    let cmdpanel = null;
    switch (blorbcmd) {
    case 'download':
        cmdpanel = <DownloadBlorbPanel />;
        break;
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
                <button onClick={ evhan_click_download }>Download</button>
                <button>Add Chunk</button>
            </div>
            { cmdpanel }
        </div>
    );
}

function ChunkListEntry({ chunk, isselected } : { chunk:Chunk, isselected:boolean })
{
    let blorb = useContext(BlorbCtx);
    let setSelection = useContext(SetSelectionCtx);
    
    let resentry = blorb_resentry_for_chunk(blorb, chunk);
    
    function evhan_click(ev: React.MouseEvent<HTMLLIElement, MouseEvent>) {
        ev.stopPropagation();
        setSelection(chunk.reactkey);
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

function DownloadBlorbPanel()
{
    let blorb = useContext(BlorbCtx);

    let filename = 'blorb.blb'; //### from saved filename ### or zblorb/gblorb?
    let mimetype = 'application/x-blorb';

    let data = blorb_get_data(blorb);
    
    return (
        <div className="InlinePane">
            <ArrowDownload data={ data } filename={ filename } mimetype={ mimetype } />{' '}
            Download blorb file ({ pretty_size(data.length) })
        </div>
    );
}

function reduceBlorb(blorb: Blorb, act: any) : Blorb
{
    if (act.type == 'load') {
        return act.blorb;
    }
    return blorb;
}

