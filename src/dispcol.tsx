import React from 'react';

import { Chunk, Blorb, CTypes } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

export function DisplayChunk({ blorb, chunk } : { blorb:Blorb, chunk:Chunk })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;
    switch (chunk.type.stype) {
    case 'RIdx':
        display = DisplayChunkResIndex(blorb, chunk as CTypes.CTResIndex);
        break;
    case 'Fspc':
        display = DisplayChunkFrontispiece(blorb, chunk as CTypes.CTFrontispiece);
        break;
    case 'IFmd':
        display = DisplayChunkMetadata(blorb, chunk as CTypes.CTMetadata);
        break;
    default:
        display = DisplayChunkRaw(blorb, chunk);
        break;
    }
    
    return (
        <div className="DisplayChunk">
            <h3>
                Chunk { chunk.index }:{' '}
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

function DisplayChunkRaw(blorb: Blorb, chunk: Chunk)
{
    let subdata = chunk.data.slice(0, 512);
    let ls = [ ...subdata ].map(byte_to_hex);
    let hexdump = ls.join(' ');

    let extra = chunk.data.length - subdata.length;

    return (
        <div>
            <code className="HexData">{ hexdump }</code>
            { ( extra ?
                <span className="InfoLabel"> (...{ extra } more)</span>
                : null) }
        </div>
    );
}

function DisplayChunkResIndex(blorb: Blorb, chunk: CTypes.CTResIndex)
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
    return (
        <li key={ ent.pos }>
            <code className="IType">{ ent.usage }</code>
            {' #'}{ ent.resnum },
            &nbsp;
            <span className="InfoLabel">starts at</span> { ent.pos }
        </li>
        //### link!
    );
}

function DisplayChunkFrontispiece(blorb: Blorb, chunk: CTypes.CTFrontispiece)
{
    return (
        <div>
            Cover image is{' '}
            <code className="IType">PICT</code>
            {' #'}{ chunk.picnum }
        </div>
        //### link!
    );
}

function DisplayChunkMetadata(blorb: Blorb, chunk: CTypes.CTMetadata)
{
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
            <div className="InfoLabel">XML content:</div>
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

    let subls = [ ...nod.childNodes ].map(subnod =>
        ShowXMLNode({ nod:subnod })
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
