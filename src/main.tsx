import React from 'react';
import { useState, useContext, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Chunk, Blorb, new_blorb, blorb_get_data } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { parse_blorb } from './parseblorb';
import { pretty_size } from './readable';

import { BlorbCtx, SetSelectionCtx } from './contexts';
import { ChunkCmd, ChunkCmdCtx, SetChunkCmdCtx } from './contexts';
import { BlorbCmd, BlorbCmdCtx, SetBlorbCmdCtx } from './contexts';
import { DisplayColumn } from './dispcol';
import { ArrowDownload } from './widgets';

let initialBlorb: Blorb|undefined;

export function init()
{
    initialBlorb = parse_blorb((window as any).sensory_blb_file); //###
    
    const appel = document.getElementById('appbody') as HTMLElement;
    let root = createRoot(appel);
    if (root)
        root.render( <MyApp /> );
}

function MyApp()
{
    if (!initialBlorb) {
        initialBlorb = new_blorb();
    }
    
    const [blorb, dispBlorb] = useReducer(reduceBlorb, initialBlorb!);
    const [selected, setSelected] = useState(-1);
    const [chunkcmd, setChunkCmd] = useState(null as ChunkCmd);
    const [blorbcmd, setBlorbCmd] = useState(null as BlorbCmd);

    (window as any).curblorb = blorb; //###

    let setSelectedWrap = function(val: number) {
        if (val != selected) {
            setSelected(val);
            setChunkCmd(null);
        }
    };
    
    function evhan_click_background(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        setSelectedWrap(-1);
    }
    
    let chunkls = blorb.chunks.map(chunk =>
        <ChunkListEntry key={ chunk.reactkey } chunk={ chunk } isselected={ chunk.reactkey == selected } />
    );

    return (
        <SetSelectionCtx.Provider value={ setSelectedWrap }>
        <SetChunkCmdCtx.Provider value={ setChunkCmd }>
        <ChunkCmdCtx.Provider value={ chunkcmd }>
        <SetBlorbCmdCtx.Provider value={ setBlorbCmd }>
        <BlorbCmdCtx.Provider value={ blorbcmd }>
        <BlorbCtx.Provider value={ blorb }>
            <div className="IndexCol" onClick={ evhan_click_background }>
                <BlorbInfoHeader />
                <ul className="ChunkList">
                    { chunkls }
                </ul>
            </div>
            <DisplayColumn blorb={ blorb } selected={ selected } />
        </BlorbCtx.Provider>
        </BlorbCmdCtx.Provider>
        </SetBlorbCmdCtx.Provider>
        </ChunkCmdCtx.Provider>
        </SetChunkCmdCtx.Provider>
        </SetSelectionCtx.Provider>
    );
}

function BlorbInfoHeader()
{
    let blorb = useContext(BlorbCtx);
    let blorbcmd = useContext(BlorbCmdCtx);
    let setblorbcmd = useContext(SetBlorbCmdCtx);
    let setchunkcmd = useContext(SetChunkCmdCtx);

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
        ev.preventDefault();
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
    return blorb;
}

