import React from 'react';
import { useState, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Chunk, Blorb, new_blorb } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { parse_blorb } from './parseblorb';
import { pretty_size } from './readable';

let initialBlorb: Blorb|undefined;

export function init()
{
    initialBlorb = parse_blorb((window as any).sensory_blb_file); //###
    
    const appel = document.getElementById('appbody') as HTMLElement;
    let root = createRoot(appel);
    if (root)
        root.render( <MyApp /> );
}

type Product = { title:string, id:number };

function MyApp()
{
    if (!initialBlorb) {
        initialBlorb = new_blorb();
    }
    
    const [blorb, dispBlorb] = useReducer(reduceBlorb, initialBlorb!);
    const [selected, setSelected] = useState(-1);
    
    (window as any).curblorb = blorb; //###

    let chunkls = blorb.chunks.map(chunk =>
        ChunkListEntry(chunk, blorb, (chunk.reactkey == selected), setSelected)
    );
    
    return (
        <>
            <div className="IndexCol">
                <div className="BlorbInfo">
                    <div className="BlorbTitle">{ blorb.filename || '(untitled)' }</div>
                    <div className="BlorbGloss">
                    { blorb.chunks.length } chunks, { pretty_size(blorb.totallen) }</div>
                </div>
                <ul className="ChunkList">
                    { chunkls }
                </ul>
            </div>
            <div className="DisplayCol">
            </div>
        </>
    );
}

function ChunkListEntry(chunk: Chunk, blorb: Blorb, isselected: boolean, setSelected: (_:number)=>void)
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);
    
    function evhan_click(ev: React.MouseEvent<HTMLLIElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        setSelected(chunk.reactkey);
    }
    
    return (
        <li key={ chunk.reactkey } className={ isselected ? "Selected" : "" } onClick={ evhan_click }>
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

function reduceBlorb(blorb: Blorb, act: any) : Blorb
{
    return blorb;
}

