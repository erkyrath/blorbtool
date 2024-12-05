import React from 'react';

import { Chunk, Blorb, ChunkTypes } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

export function DisplayChunk({ blorb, chunk } : { blorb:Blorb, chunk:Chunk })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;
    switch (chunk.type.stype) {
    case 'RIdx':
        display = DisplayCTResIndex(blorb, chunk as ChunkTypes.CTResIndex);
        break;
    case 'Fspc':
        display = DisplayCTFrontispiece(blorb, chunk as ChunkTypes.CTFrontispiece);
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

function DisplayCTResIndex(blorb: Blorb, chunk: ChunkTypes.CTResIndex)
{
    let entls = chunk.entries.map(ent =>
        DisplayCTResIndexEntry(ent)
    );
    
    return (
        <div>
            <ul className="InfoList">
                { entls }
            </ul>
        </div>
    );
}

function DisplayCTResIndexEntry(ent: ChunkTypes.CTResIndexEntry)
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

function DisplayCTFrontispiece(blorb: Blorb, chunk: ChunkTypes.CTFrontispiece)
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

