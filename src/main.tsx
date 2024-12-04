import React from 'react';
import { useState, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { Blorb, new_blorb } from './parseblorb';
import { parse_blorb } from './parseblorb';

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

    return (
        <>
            <div className="IndexCol">
                <div className="BlorbInfo">
                    <div className="BlorbTitle">{ blorb.filename || '(untitled)' }</div>
                    <div className="BlorbGloss">
                    { blorb.chunks.length } chunks, { blorb.totallen } bytes</div>
                </div>
            </div>
            <div className="DisplayCol">
            </div>
        </>
    );
}


function reduceBlorb(blorb: Blorb, act: any) : Blorb
{
    return blorb;
}

type MouseEv = React.MouseEventHandler<HTMLButtonElement>;

