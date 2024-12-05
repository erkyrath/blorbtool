import React from 'react';

import { Chunk, Blorb } from './blorb';
import { ChunkResIndex, ChunkResIndexEntry } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

export function DisplayChunk({ blorb, chunk } : { blorb:Blorb, chunk:Chunk })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;
    switch (chunk.type.stype) {
    case 'RIdx':
        display = DisplayChunkResIndex(blorb, chunk as ChunkResIndex);
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

function DisplayChunkResIndex(blorb: Blorb, chunk: ChunkResIndex)
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

function DisplayChunkResIndexEntry(ent: ChunkResIndexEntry)
{
    return (
        <li key={ ent.pos }>
            <code className="IType">{ ent.usage }</code>
            {' #'}{ ent.resnum },
            &nbsp;
            <span className="InfoLabel">starts at</span> { ent.pos }
        </li>
    );
}

