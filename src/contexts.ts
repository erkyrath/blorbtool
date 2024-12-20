import { createContext } from 'react';

import { Blorb, new_blorb } from './blorb';
import { BlorbEditCmd } from './editblorb';

/* React context objects. See MyApp() for how these are set up.
 */

/* A few utility type declarations. */
export type AltDisplay = 'about' | 'errors' | null;
export type ChunkCmd = 'download' | 'delete' | null;

export type LoadBlorbAction = { filename:string, data:Uint8Array } | undefined;

/* The type that describes the current modal dialogue box. */
export type ModalForm = (
    null 
    | { type:'fetchchunk', key:number }
    | { type:'delchunk', key:number }
    | { type:'fetchblorb' }
    | { type:'addchunk' }
    | { type:'addchunkthen', filename:string, data:Uint8Array }
    | { type:'changefrontis', oldkey:number, key:number }
);

/* The type that describes the big messy React context. This includes all
   state and setters.
*/
export type ContextContent = {
    selection: number;
    setSelection: (val:number) => void;

    showloader: boolean,
    altdisplay: AltDisplay;
    setAltDisplay: (val:AltDisplay) => void;
    
    modalform: ModalForm;
    setModalForm: (val:ModalForm) => void;
    
    blorb: Blorb;
    loadBlorbFile: (act:LoadBlorbAction) => void;
    editBlorb: (act:BlorbEditCmd) => void;
    editBlorbAndSelect: (act:BlorbEditCmd) => void;
};

export const ReactCtx = createContext({
    selection: -1,
    setSelection: (val:number) => {},
    showloader: false,
    altdisplay: null,
    setAltDisplay: (val:AltDisplay) => {},
    modalform: null,
    setModalForm: (val:ModalForm) => {},
    blorb: new_blorb(),
    loadBlorbFile: (act:LoadBlorbAction) => {},
    editBlorb: (act:BlorbEditCmd) => {},
    editBlorbAndSelect: (act:BlorbEditCmd) => {},
} as ContextContent);




