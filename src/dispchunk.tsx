import React from 'react';
import { useState, useContext, useRef } from 'react';

import { Chunk, CTypes } from './chunk';
import { Blorb, blorb_resentry_for_chunk, blorb_chunk_for_usage, blorb_first_chunk_for_type } from './blorb';
import { byte_to_hex } from './readable';
import { ReactCtx } from './contexts';

import { ArrowToChunk, EditButton, DeleteButton } from './widgets';

/* React components to display a chunk. */

/* Display a chunk of any type. This invokes the appropriate chunk-type
   component, or DisplayChunkRaw.
*/
export function DisplayChunkFormatted({ blorb, chunk }: { blorb:Blorb, chunk:Chunk })
{
    let resentry = blorb_resentry_for_chunk(blorb, chunk);

    switch (chunk.type.stype) {
    case 'RIdx':
        return <DispChunks.DCResIndex chunk={ chunk as CTypes.CTResIndex } />;
    case 'Fspc':
        return <DispChunks.DCFrontispiece chunk={ chunk as CTypes.CTFrontispiece } />;
    case 'RDes':
        return <DispChunks.DCResDescs chunk={ chunk as CTypes.CTResDescs } />;
    case 'IFmd':
        return <DispChunks.DCMetadata chunk={ chunk as CTypes.CTMetadata } />;
    case 'ZCOD':
        return <DispChunks.DCZCode chunk={ chunk as CTypes.CTZCode } />
    case 'GLUL':
        return <DispChunks.DCGlulx chunk={ chunk as CTypes.CTGlulx } />
    case 'PNG ':
        return <DispChunks.DCImage chunk={ chunk as CTypes.CTImage } resentry={ resentry } />
    case 'JPEG':
        return <DispChunks.DCImage chunk={ chunk as CTypes.CTImage } resentry={ resentry } />
    case 'RelN':
        return <DispChunks.DCReleaseNumber chunk={ chunk as CTypes.CTReleaseNumber } />
    case 'Reso':
        return <DispChunks.DCResolution chunk={ chunk as CTypes.CTResolution } />
    case 'TEXT':
        return <DispChunks.DCText chunk={ chunk as CTypes.CTText } />
    case 'AUTH':
    case 'ANNO':
    case '(c) ':
    case 'SNam':
        return <DispChunks.DCText chunk={ chunk as CTypes.CTText } />
    default:
        return <DisplayChunkRaw chunk={ chunk } />;
    }
}

/* Display a chunk as raw hex. */
export function DisplayChunkRaw({ chunk }: { chunk:Chunk })
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

export namespace DispChunks {

    /* Chunk display for 'RIdx'. */
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

    /* One resource entry for 'RIdx'. */
    function DCResIndexEntry({ ent }: { ent:CTypes.CTResIndexEntry })
    {
        let rctx = useContext(ReactCtx);
        let blorb = rctx.blorb;
        let chunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);
    
        return (
            <tr>
                <td>
                    <code className="IType">{ ent.usage }</code>
                    {' #'}{ ent.resnum }
                </td>
                <td>
                    { ( chunk ?
                        <>
                            {' '}&nbsp; <ArrowToChunk destkey={ chunk.refkey } />
                        </>
                        :
                        <>
                            {' '}&nbsp; <span className="ErrorText">chunk not found</span>
                        </>) }
                    {' '}&nbsp;{' '}
                </td>
                <td>
                    <span className="InfoLabel">(starts at { ent.pos })</span>
                </td>
            </tr>
        );
    }

    /* Chunk display for 'RDes'. */
    export function DCResDescs({ chunk }: { chunk:CTypes.CTResDescs })
    {
        let counter = 0;
        let entls = chunk.entries.map(ent =>
            <DCResDescEntry ent={ ent } key={ counter++ } />
        );
    
        return (
            <div>
                <ul className="InfoList">
                    { entls }
                </ul>
            </div>
        );
    }
    
    /* One resource entry for 'RDes'. */
    function DCResDescEntry({ ent }: { ent:CTypes.CTResDescEntry })
    {
        let rctx = useContext(ReactCtx);
        let blorb = rctx.blorb;
        let chunk = blorb_chunk_for_usage(blorb, ent.usage, ent.resnum);
    
        function evhan_del_entry() {
            rctx.editBlorb({ type:'setresdesc', usage:ent.usage, resnum:ent.resnum, text:'' });
        }
    
        return (
            <li>
                <code className="IType">{ ent.usage }</code>
                {' #'}{ ent.resnum }
                { ( chunk ?
                    <>
                        {' '}&nbsp; <ArrowToChunk destkey={ chunk.refkey } />
                    </>
                    :
                    <>
                        {' '}&nbsp; <span className="ErrorText">resource not found</span>
                        {' '}<DeleteButton func={ evhan_del_entry } />
                    </>) }
                <div className="SubText">
                    { ent.text }
                </div>
            </li>
        );
    }

    /* Chunk display for 'Fspc'. */
    export function DCFrontispiece({ chunk }: { chunk:CTypes.CTFrontispiece })
    {
        let rctx = useContext(ReactCtx);
        let blorb = rctx.blorb;
        let imgchunk = blorb_chunk_for_usage(blorb, 'Pict', chunk.picnum);
    
        return (
            <div>
                Cover image is{' '}
                <code className="IType">PICT</code>
                {' #'}{ chunk.picnum }
                { ( imgchunk ?
                    <>
                        {' '}&nbsp; <ArrowToChunk destkey={ imgchunk.refkey } />
                    </>
                    :
                    <>
                        {' '}&nbsp; <span className="ErrorText">resource not found</span>
                    </>) }
            </div>
        );
    }

    /* Chunk display for 'IFmd'. */
    export function DCMetadata({ chunk }: { chunk:CTypes.CTMetadata })
    {
        const [showraw, setShowRaw] = useState(false);
    
        function evhan_click(ev: MouseEv) {
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

    /* One node of the XML display for 'IFmd'. */
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

    /* Chunk display for 'ZCOD'. */
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

    /* Chunk display for 'GLUL'. */
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

    /* Chunk display for 'JPEG' or 'PNG '. Includes editing for the
       frontispiece flag and the alt-text line. */
    export function DCImage({ chunk, resentry }: { chunk:CTypes.CTImage, resentry:CTypes.CTResIndexEntry|undefined })
    {
        const [editingKey, setEditingKey] = useState(-1);
        const inputRef = useRefInput();
        
        let rctx = useContext(ReactCtx);
        let blorb = rctx.blorb;
        let editing = (editingKey == chunk.refkey);

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
            alttext = rdeschunk.usagemap.get('Pict:'+resentry.resnum);
        }

        let frontis = false;
        let fspcchunk = blorb_first_chunk_for_type(blorb, 'Fspc') as CTypes.CTFrontispiece;
        if (fspcchunk && resentry) {
            if (resentry.resnum == fspcchunk.picnum)
                frontis = true;
        }

        function evhan_edit_frontis() {
            let frontischunk = blorb_first_chunk_for_type(blorb, 'Fspc') as CTypes.CTFrontispiece;
            if (!frontis) {
                if (frontischunk) {
                    let oldchunk = blorb_chunk_for_usage(blorb, 'Pict', frontischunk.picnum);
                    if (oldchunk) {
                        rctx.setModalForm({ type:'changefrontis', oldkey:oldchunk.refkey, key:chunk.refkey });
                        return;
                    }
                }
                rctx.editBlorb({ type:'setfrontis', refkey:chunk.refkey });
            }
            else {
                // Simply delete the frontispiece chunk to clear this flag.
                if (frontischunk)
                    rctx.editBlorb({ type:'delchunk', refkey:frontischunk.refkey });
            }
        }
    
        function evhan_edit_alttext() {
            setEditingKey(editing ? -1 : chunk.refkey);
        }

        function evhan_click_frontis_cancel(ev: MouseButtonEv) {
            setEditingKey(-1);
        }

        function evhan_click_frontis_save(ev: MouseButtonEv) {
            if (inputRef.current && resentry) {
                rctx.editBlorb({ type:'setresdesc', usage:resentry.usage, resnum:resentry.resnum, text:inputRef.current.value.trim() });
            }
            setEditingKey(-1);
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
                    { (resentry ?
                       <>
                           <li>
                               <span className="InfoLabel">Frontispiece</span>:{' '}
                               <EditButton func={ evhan_edit_frontis } />{' '}
                               { frontis ? "yes" : "\u2013" }
                           </li>
                           <li>
                               <span className="InfoLabel">Alt text:</span>{' '}
                               <EditButton func={ evhan_edit_alttext } />{' '}
                               { (!editing ?
                                  <span className="AltText">{ alttext }</span>
                                  : null
                                 ) }
                           </li>
                           { (editing ?
                              <>
                                  <li className="ControlRow AlignRight">
                                      <input type="text" className="TextLine" defaultValue={ alttext } placeholder="Alt text for this image" ref={ inputRef } />
                                  </li>
                                  <li className="ControlRow InlineControls AlignRight">
                                      <div className="Control">
                                          <button onClick={ evhan_click_frontis_cancel }>Cancel</button>
                                      </div>
                                      <div className="Control">
                                          <button onClick={ evhan_click_frontis_save }>Save</button>
                                      </div>
                                  </li>
                              </>
                              : null) }
                       </>
                       : null) }
                </ul>
                <div className="ImageBox">
                    <img src={dataurl} />
                </div>
            </>
        );
    }

    /* Chunk display for 'RelN'. */
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

    /* Chunk display for 'Reso'. */
    export function DCResolution({ chunk }: { chunk:CTypes.CTResolution })
    {
        let counter = 0;
        let entls = chunk.entries.map(ent =>
            <DCResolutionEntry ent={ ent } key={ counter++ } />
        );

        let win = chunk.window;
    
        return (
            <div>
                <ul className="InfoList">
                    <li>
                        <span className="InfoLabel">Window size:</span>{' '}
                        { win.winsize.width }&#xD7;
                        { win.winsize.height }
                    </li>
                    <li>
                        <span className="InfoLabel">Min window size:</span>{' '}
                        { win.minwinsize.width }&#xD7;
                        { win.minwinsize.height }
                    </li>
                    <li>
                        <span className="InfoLabel">Max window size:</span>{' '}
                        { win.maxwinsize.width }&#xD7;
                        { win.maxwinsize.height }
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

    /* One entry line for 'Reso'. */
    function DCResolutionEntry({ ent }: { ent:CTypes.CTResolutionEntry })
    {
        let rctx = useContext(ReactCtx);
        let blorb = rctx.blorb;
        let chunk = blorb_chunk_for_usage(blorb, 'Pict', ent.resnum);

        function evhan_del_entry() {
            rctx.editBlorb({ type:'delresoentry', resnum:ent.resnum });
        }
    
        return (
            <tr>
                <td>
                    <code className="IType">Pict</code>
                    {' #'}{ ent.resnum }
                </td>
                <td>
                    { ( chunk ?
                        <>
                            {' '}&nbsp; <ArrowToChunk destkey={ chunk.refkey } />
                        </>
                        :
                        <>
                            {' '}&nbsp; <span className="ErrorText">resource not found</span>
                        </>) }
                    {' \xA0 '}
                </td>
                <td>
                    stdratio { ent.stdratio.numerator }/{ ent.stdratio.numerator },
                    min { ent.minratio.numerator }/{ ent.minratio.numerator },
                    max { ent.maxratio.numerator }/{ ent.maxratio.numerator }
                </td>
                <td>
                    { ( !chunk ?
                        <DeleteButton func={ evhan_del_entry } />
                        : null) }
                </td>
            </tr>
        );
    }

    /* Chunk display for text lines (various). */
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


// Late typedefs (because my editor gets confused)

type MouseEv = React.MouseEvent<HTMLElement, MouseEvent>;
type MouseButtonEv = React.MouseEvent<HTMLButtonElement, MouseEvent>;
type ChangeEv = React.ChangeEvent<HTMLInputElement>;

const useRefInput = () => useRef<HTMLInputElement>(null);
