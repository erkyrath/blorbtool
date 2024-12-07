import React from 'react';
import { useState, useContext } from 'react';

import { Chunk, Blorb, CTypes } from './blorb';
import { chunk_readable_desc, blorb_resentry_for_chunk } from './blorb';
import { pretty_size, byte_to_hex } from './readable';

import { DispChunks } from './dispchunk';

export function DisplayChunk({ blorb, chunk } : { blorb:Blorb, chunk:Chunk })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    let display;
    switch (chunk.type.stype) {
    case 'RIdx':
        display = <DispChunks.DCResIndex chunk={ chunk as CTypes.CTResIndex } />;
        break;
    case 'Fspc':
        display = <DispChunks.DCFrontispiece chunk={ chunk as CTypes.CTFrontispiece } />;
        break;
    case 'IFmd':
        display = <DispChunks.DCMetadata chunk={ chunk as CTypes.CTMetadata } />;
        break;
    case 'ZCOD':
        display = <DispChunks.DCZCode chunk={ chunk as CTypes.CTZCode } />
        break;
    case 'GLUL':
        display = <DispChunks.DCGlulx chunk={ chunk as CTypes.CTGlulx } />
        break;
    case 'PNG ':
        display = <DispChunks.DCImgPNG chunk={ chunk as CTypes.CTImage } />
        break;
    case 'JPEG':
        display = <DispChunks.DCImgJPEG chunk={ chunk as CTypes.CTImage } />
        break;
    case 'RelN':
        display = <DispChunks.DCReleaseNumber chunk={ chunk as CTypes.CTReleaseNumber } />
        break;
    case 'Reso':
        display = <DispChunks.DCResolution chunk={ chunk as CTypes.CTResolution } />
        break;
    case 'AUTH':
    case 'ANNO':
    case '(c) ':
    case 'SNam':
        display = <DispChunks.DCText chunk={ chunk as CTypes.CTText } />
        break;
    default:
        display = <DispChunks.DCRaw chunk={ chunk } />;
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
