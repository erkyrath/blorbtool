import React from 'react';
import { useState, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Chunk, Blorb, new_blorb } from './blorb';
import { chunk_readable_desc } from './blorb';
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

    let chunkls = blorb.chunks.map(chunk =>
        ChunkListEntry(chunk, blorb)
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

function ChunkListEntry(chunk: Chunk, blorb: Blorb)
{
    return (
        <li key={ chunk.reactkey }>
            <div className="ChunkTitle">{ chunk_readable_desc(chunk) }</div>
            <div className="ChunkGloss">{ pretty_size(chunk.data.length) }</div>
            <div className="ChunkType">
                <code className="IType">{ chunk.type.stype }</code>
                { chunk.isform ? (
                    <>
                        {' '}(<code className="IType">ABCD</code> 999)
                    </>
                ) : null }
            </div>
        </li>
    );
}

function reduceBlorb(blorb: Blorb, act: any) : Blorb
{
    return blorb;
}

type MouseEv = React.MouseEventHandler<HTMLButtonElement>;

