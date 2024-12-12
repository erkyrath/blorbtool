import { createContext } from 'react';

import { Blorb, new_blorb } from './blorb';
import { BlorbEditCmd } from './editblorb';

export type AltDisplay = 'about' | 'errors' | null;
export type ChunkCmd = 'download' | 'delete' | null;
export type LoadBlorbAction = { filename:string, data:Uint8Array } | undefined;

export type ModalForm = (
    null 
    | { type:'fetchchunk', key:number }
    | { type:'delchunk', key:number }
    | { type:'fetchblorb' }
    | { type:'addchunk' }
    | { type:'changefrontis', oldkey:number, key:number }
);

export type ContextContent = {
    selection: number;
    setSelection: (val:number) => void;
    
    altdisplay: AltDisplay;
    setAltDisplay: (val:AltDisplay) => void;
    
    modalform: ModalForm;
    setModalForm: (val:ModalForm) => void;
    
    blorb: Blorb;
    loadBlorbFile: (act:LoadBlorbAction) => void;
    editBlorb: (act:BlorbEditCmd) => void;
};

export const ReactCtx = createContext({
    selection: -1,
    setSelection: (val:number) => {},
    altdisplay: null,
    setAltDisplay: (val:AltDisplay) => {},
    modalform: null,
    setModalForm: (val:ModalForm) => {},
    blorb: new_blorb(),
    loadBlorbFile: (act:LoadBlorbAction) => {},
    editBlorb: (act:BlorbEditCmd) => {},
} as ContextContent);

export const BlorbCtx = createContext(new_blorb());



