import React from 'react';
import { useState, useContext } from 'react';

import { Chunk, CTypes } from './chunk';
import { Blorb, blorb_chunk_for_usage, blorb_first_chunk_for_type } from './blorb';
import { byte_to_hex } from './readable';
import { BlorbCtx } from './contexts';

import { ArrowToChunk, EditButton } from './widgets';

export namespace DispChunks {

    export function DCRaw({ chunk }: { chunk:Chunk })
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

    export function DCResIndex({ chunk }: { chunk:CTypes.CTResIndex })
    {
        let entls = chunk.entries.map(ent =>
            <DCResIndexEntry ent={ ent } key={ ent.pos } />
        );
    
        return (
            <div>
                <table className="InfoTable">
                    <tbody>
                        { entls }
                    </tbody>
                </table>
            </div>
        );
    }

    function DCResIndexEntry({ ent }: { ent:CTypes.CTResIndexEntry })
    {
        let blorb = useContext(BlorbCtx);
        let chunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);
    
        //### or error if not found
    
        return (
            <tr>
                <td>
                    <code className="IType">{ ent.usage }</code>
                    {' #'}{ ent.resnum }
                </td>
                <td>
                    { ( chunk ?
                        <>
                            {' '}&nbsp; <ArrowToChunk destkey={ chunk.reactkey } />
                        </>
                        : null) }
                    {' '}&nbsp;{' '}
                </td>
                <td>
                    <span className="InfoLabel">(starts at { ent.pos })</span>
                </td>
            </tr>
        );
    }

    export function DCResourceDescs({ chunk }: { chunk:CTypes.CTResDescs })
    {
        let counter = 0;
        let entls = chunk.entries.map(ent =>
            <DCResourceDescEntry ent={ ent } key={ counter++ } />
        );
    
        return (
            <div>
                <ul className="InfoList">
                    { entls }
                </ul>
            </div>
        );
    }
    
    function DCResourceDescEntry({ ent }: { ent:CTypes.CTResDescEntry })
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
                <div className="SubText">
                    { ent.text }
                </div>
            </li>
        );
    }

    export function DCFrontispiece({ chunk }: { chunk:CTypes.CTFrontispiece })
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

    export function DCMetadata({ chunk }: { chunk:CTypes.CTMetadata })
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
                    <a href="#" onClick={ evhan_click }>(show XML)</a>
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

    export function DCZCode({ chunk }: { chunk:CTypes.CTZCode })
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

    export function DCGlulx({ chunk }: { chunk:CTypes.CTGlulx })
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

    export function DCImage({ chunk, resentry }: { chunk:CTypes.CTImage, resentry:CTypes.CTResIndexEntry|undefined })
    {
        let blorb = useContext(BlorbCtx);

        let label = '???';
        let mimetype = '???';
        switch (chunk.type.stype) {
        case 'PNG ':
            label = 'PNG';
            mimetype = 'image/png';
            break;
        case 'JPEG':
            label = 'JPEG';
            mimetype = 'image/jpeg';
            break;
        }
        
        if (!chunk.imgsize) {
            return (
                <div>Unable to recognize { label } data.</div>
            );
        };

        let alttext: string|undefined;
        let rdeschunk = blorb_first_chunk_for_type(blorb, 'RDes') as CTypes.CTResDescs;
        if (rdeschunk && resentry) {
            //### map lookup
            for (let ent of rdeschunk.entries) {
                if (ent.usage == 'Pict' && ent.resnum == resentry.resnum)
                    alttext = ent.text;
            }
        }

        let frontis = false;
        let fspcchunk = blorb_first_chunk_for_type(blorb, 'Fspc') as CTypes.CTFrontispiece;
        if (fspcchunk && resentry) {
            if (resentry.resnum == fspcchunk.picnum)
                frontis = true;
        }

        function evhan_edit_frontis() {
        }
    
        function evhan_edit_alttext() {
        }
    
        let dataurl = URL.createObjectURL(
            new Blob([ chunk.data ], { type: mimetype })
        );
    
        return (
            <>
                <ul className="InfoList">
                    <li>
                        <span className="InfoLabel">Image size:</span>{' '}
                        { chunk.imgsize.width }&#xD7;
                        { chunk.imgsize.height }
                    </li>
                    <li>
                        <span className="InfoLabel">Frontispiece</span>:{' '}
                        <EditButton func={ evhan_edit_frontis } />{' '}
                        { frontis ? "yes" : "(no)" }
                    </li>
                    <li>
                        <span className="InfoLabel">Alt text:</span>{' '}
                        <EditButton func={ evhan_edit_alttext } />{' '}
                        <span className="AltText">{ alttext }</span>
                    </li>
                </ul>
                <div className="ImageBox">
                    <img src={dataurl} />
                </div>
            </>
        );
    }

    export function DCReleaseNumber({ chunk }: { chunk:CTypes.CTReleaseNumber })
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

    export function DCResolution({ chunk }: { chunk:CTypes.CTResolution })
    {
        let counter = 0;
        let entls = chunk.entries.map(ent =>
            <DCResolutionEntry ent={ ent } key={ counter++ } />
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
                <table className="InfoTable">
                    <tbody>
                        { entls }
                    </tbody>
                </table>
            </div>
        );
    }

    function DCResolutionEntry({ ent }: { ent:CTypes.CTResolutionEntry })
    {
        let blorb = useContext(BlorbCtx);
        let chunk = blorb_chunk_for_usage(blorb, 'Pict', ent.resnum);
    
    
        return (
            <tr>
                <td>
                    <code className="IType">Pict</code>
                    {' #'}{ ent.resnum }
                </td>
                <td>
                    { ( chunk ?
                        <>
                            {' '}&nbsp; <ArrowToChunk destkey={ chunk.reactkey } />
                        </>
                        : null) }
                    {' \xA0 '}
                </td>
                <td>
                    stdratio { ent.stdratio.numerator }/{ ent.stdratio.numerator },
                    minratio { ent.minratio.numerator }/{ ent.minratio.numerator },
                    maxratio { ent.maxratio.numerator }/{ ent.maxratio.numerator }
                </td>
            </tr>
        );
    }

    export function DCText({ chunk }: { chunk:CTypes.CTText })
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

}

