import React from 'react';
import { useState, useContext } from 'react';

import { Chunk, Blorb, CTypes } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk, blorb_chunk_for_usage } from './blorb';
import { BlorbCtx } from './contexts';
import { ArrowToChunk } from './widgets';
import { pretty_size, byte_to_hex } from './readable';

export function DisplayChunk({ blorb, chunk } : { blorb:Blorb, chunk:Chunk })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;
    switch (chunk.type.stype) {
    case 'RIdx':
        display = <DisplayChunkResIndex chunk={ chunk as CTypes.CTResIndex } />;
        break;
    case 'Fspc':
        display = <DisplayChunkFrontispiece chunk={ chunk as CTypes.CTFrontispiece } />;
        break;
    case 'IFmd':
        display = <DisplayChunkMetadata chunk={ chunk as CTypes.CTMetadata } />;
        break;
    default:
        display = <DisplayChunkRaw chunk={ chunk } />;
        break;
    }
    
    return (
        <div className="DisplayChunk">
            <h3>
                Chunk:{' '}
                { chunk_readable_desc(chunk) }
            </h3>
            <ul className="InfoList">
                <li><span className="InfoLabel">Type:</span>{' '}
                    <code className="IType">
                        { chunk.type.stype }
                        { chunk.formtype ? ('/'+chunk.formtype.stype) : '' }
                    </code>
                </li>
                { (resentry ?
                   <li><span className="InfoLabel">Usage:</span>{' '}
                       <code className="IType">{ resentry.usage }</code>
                       {' #'}{ resentry.resnum }
                   </li>
                   : null) }
                <li>
                    <span className="InfoLabel">Size:</span>{' '}
                    { pretty_size(chunk.data.length) }
                </li>
                <li>
                    <span className="InfoLabel">File position:</span> { chunk.pos }
                </li>
            </ul>
            { display }
        </div>
    );
}

function DisplayChunkRaw({ chunk }: { chunk:Chunk })
{
    let subdata = chunk.data.slice(0, 512);
    let ls = [ ...subdata ].map(byte_to_hex);
    let hexdump = ls.join(' ');

    let extra = chunk.data.length - subdata.length;

    return (
        <div>
            <code className="HexData">{ hexdump }</code>
            { ( extra ?
                <span className="InfoLabel"> &nbsp; (...{ extra } more)</span>
                : null) }
        </div>
    );
}

function DisplayChunkResIndex({ chunk }: { chunk:CTypes.CTResIndex })
{
    let entls = chunk.entries.map(ent =>
        DisplayChunkResIndexEntry(ent)
    );
    
    return (
        <div>
            <ul className="InfoList">
                { entls }
            </ul>
        </div>
    );
}

function DisplayChunkResIndexEntry(ent: CTypes.CTResIndexEntry)
{
    let blorb = useContext(BlorbCtx);
    let chunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);

    //### or error if not found
    
    return (
        <li key={ ent.pos }>
            <code className="IType">{ ent.usage }</code>
            {' #'}{ ent.resnum },
            &nbsp;
            <span className="InfoLabel">starts at</span> { ent.pos }
            { ( chunk ?
                <>
                    {' '}&nbsp; <ArrowToChunk destkey={ chunk.reactkey } />
                </>
                : null) }
        </li>
    );
}

function DisplayChunkFrontispiece({ chunk }: { chunk:CTypes.CTFrontispiece })
{
    let blorb = useContext(BlorbCtx);
    let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', chunk.picnum);

    //### or error if not found
    
    return (
        <div>
            Cover image is{' '}
            <code className="IType">PICT</code>
            {' #'}{ chunk.picnum }
            { ( imgchunk ?
                <>
                    {' '}&nbsp; <ArrowToChunk destkey={ imgchunk.reactkey } />
                </>
                : null) }
        </div>
    );
}

function DisplayChunkMetadata({ chunk }: { chunk:CTypes.CTMetadata })
{
    const [showraw, setShowRaw] = useState(false);

    function evhan_click(ev: React.MouseEvent<HTMLElement, MouseEvent>) {
        ev.preventDefault();
        ev.stopPropagation();
        setShowRaw(!showraw);
    }

    if (showraw) {
        return (
            <>
                <div className="InfoLabel">
                    XML content:{' '}
                    <a href="#" onClick={ evhan_click }>(show parsed)</a>
                </div>
                <pre>
                    { chunk.metadata }
                </pre>
            </>
        );
    }
    
    let xmlparser = new DOMParser();
    let xmldoc = xmlparser.parseFromString(chunk.metadata, 'text/xml');

    if (!xmldoc.childNodes.length) {
        return (
            <div>
                (XML content not found)
            </div>
        );
    }

    let xmlnod = xmldoc.childNodes[0];
    
    return (
        <>
            <div className="InfoLabel">
                XML content:{' '}
                <a href="#" onClick={ evhan_click }>(show raw)</a>
            </div>
            <ul className="NestTree">
                <ShowXMLNode nod={ xmlnod } />
            </ul>
        </>
    );
}

function ShowXMLNode({ nod } : { nod:Node }) : React.ReactNode
{
    if (nod.nodeType == nod.TEXT_NODE) {
        return (
            <div>
                { nod.textContent }
            </div>
        )
    }

    if (nod.childNodes.length == 1 && nod.childNodes[0].nodeType == nod.TEXT_NODE) {
        let subnod = nod.childNodes[0];
        return (
            <div>
                { nod.nodeName }: { subnod.textContent }
            </div>
        )
    }

    let counter = 0;
    let subls = [ ...nod.childNodes ].map(subnod =>
        <div key={ counter++ }>
            <ShowXMLNode nod={ subnod } />
        </div>
    );
    
    return (
        <li>
            { nod.nodeName }:
            <ul className="NestTreeSub">
                { subls }
            </ul>
        </li>
    );
}
