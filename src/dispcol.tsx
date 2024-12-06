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
    case 'ZCOD':
        display = <DisplayChunkZCode chunk={ chunk as CTypes.CTZCode } />
        break;
    case 'GLUL':
        display = <DisplayChunkGlulx chunk={ chunk as CTypes.CTGlulx } />
        break;
    case 'PNG ':
        display = <DisplayChunkImgPNG chunk={ chunk as CTypes.CTImage } />
        break;
    case 'JPEG':
        display = <DisplayChunkImgJPEG chunk={ chunk as CTypes.CTImage } />
        break;
    case 'RelN':
        display = <DisplayChunkReleaseNumber chunk={ chunk as CTypes.CTReleaseNumber } />
        break;
    case 'Reso':
        display = <DisplayChunkResolution chunk={ chunk as CTypes.CTResolution } />
        break;
    case 'AUTH':
    case 'ANNO':
    case '(c) ':
    case 'SNam':
        display = <DisplayChunkText chunk={ chunk as CTypes.CTText } />
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
        <DisplayChunkResIndexEntry ent={ ent } key={ ent.pos } />
    );
    
    return (
        <div>
            <ul className="InfoList">
                { entls }
            </ul>
        </div>
    );
}

function DisplayChunkResIndexEntry({ ent }: { ent:CTypes.CTResIndexEntry })
{
    let blorb = useContext(BlorbCtx);
    let chunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);

    //### or error if not found
    
    return (
        <li>
            <code className="IType">{ ent.usage }</code>
            {' #'}{ ent.resnum }
            { ( chunk ?
                <>
                    {' '}&nbsp; <ArrowToChunk destkey={ chunk.reactkey } />
                </>
                : null) }
            {' '}&nbsp;{' '}
            <span className="InfoLabel">(starts at { ent.pos })</span>
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

function DisplayChunkZCode({ chunk }: { chunk:CTypes.CTZCode })
{
    return (
        <>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Release:</span>{' '}
                    { chunk.release }
                </li>
                { (chunk.serial ? (
                    <li>
                        <span className="InfoLabel">Serial:</span>{' '}
                        { chunk.serial }
                    </li>
                ) : null) }
                <li>
                    <span className="InfoLabel">Z-machine version:</span>{' '}
                    { chunk.zversion }
                </li>
            </ul>
        </>
    );
}

function DisplayChunkGlulx({ chunk }: { chunk:CTypes.CTGlulx })
{
    return (
        <>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Release:</span>{' '}
                    { chunk.release }
                </li>
                { (chunk.serial ? (
                    <li>
                        <span className="InfoLabel">Serial:</span>{' '}
                        { chunk.serial }
                    </li>
                ) : null) }
                <li>
                    <span className="InfoLabel">VM version:</span>{' '}
                    { chunk.gversion }
                </li>
                { (chunk.infversion ? (
                    <li>
                        <span className="InfoLabel">Compiler version:</span>{' '}
                        { chunk.infversion }
                    </li>
                ) : null) }
            </ul>
        </>
    );
}

function DisplayChunkImgPNG({ chunk }: { chunk:CTypes.CTImage })
{
    if (!chunk.imgsize) {
        return (
            <div>Unable to recognize PNG data.</div>
        );
    };
    
    let dataurl = URL.createObjectURL(
        new Blob([ chunk.data ], { type: 'image/png' })
    );
    
    return (
        <>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Image size:</span>{' '}
                    { chunk.imgsize.width }&#xD7;
                    { chunk.imgsize.height }
                </li>
            </ul>
            <div className="ImageBox">
                <img src={dataurl} />
            </div>
        </>
    );
}

function DisplayChunkImgJPEG({ chunk }: { chunk:CTypes.CTImage })
{
    if (!chunk.imgsize) {
        return (
            <div>Unable to recognize JPEG data.</div>
        );
    };
    
    let dataurl = URL.createObjectURL(
        new Blob([ chunk.data ], { type: 'image/jpeg' })
    );
    
    return (
        <>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Image size:</span>{' '}
                    { chunk.imgsize.width }&#xD7;
                    { chunk.imgsize.height }
                </li>
            </ul>
            <div className="ImageBox">
                <img src={dataurl} />
            </div>
        </>
    );
}

function DisplayChunkReleaseNumber({ chunk }: { chunk:CTypes.CTReleaseNumber })
{
    return (
        <>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Release number:</span>{' '}
                    { chunk.release }
                </li>
            </ul>
        </>
    );
}

function DisplayChunkResolution({ chunk }: { chunk:CTypes.CTResolution })
{
    let counter = 0;
    let entls = chunk.entries.map(ent =>
        <DisplayChunkResolutionEntry ent={ ent } key={ counter++ } />
    );
    
    return (
        <div>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Window size:</span>{' '}
                    { chunk.winsize.width }&#xD7;
                    { chunk.winsize.height }
                </li>
                <li>
                    <span className="InfoLabel">Min window size:</span>{' '}
                    { chunk.minwinsize.width }&#xD7;
                    { chunk.minwinsize.height }
                </li>
                <li>
                    <span className="InfoLabel">Max window size:</span>{' '}
                    { chunk.maxwinsize.width }&#xD7;
                    { chunk.maxwinsize.height }
                </li>
            </ul>
            <ul className="InfoList">
                { entls }
            </ul>
        </div>
    );
}

function DisplayChunkResolutionEntry({ ent }: { ent:CTypes.CTResolutionEntry })
{
    let blorb = useContext(BlorbCtx);
    let chunk = blorb_chunk_for_usage(blorb, 'Pict', ent.resnum);

    
    return (
        <li>
            <code className="IType">Pict</code>
            {' #'}{ ent.resnum }
            { ( chunk ?
                <>
                    {' '}&nbsp; <ArrowToChunk destkey={ chunk.reactkey } />
                </>
                : null) }
            {' : '}
            stdratio { ent.stdratio.numerator }/{ ent.stdratio.numerator },
            minratio { ent.minratio.numerator }/{ ent.minratio.numerator },
            maxratio { ent.maxratio.numerator }/{ ent.maxratio.numerator }
        </li>
    );
}

function DisplayChunkText({ chunk }: { chunk:CTypes.CTText })
{
    return (
        <>
            <ul className="InfoList">
                <li>
                    <span className="InfoLabel">Text:</span>{' '}
                    { chunk.text }
                </li>
            </ul>
        </>
    );
}
