import { createContext } from 'react';

import { Blorb, new_blorb } from './blorb';

export type AltDisplay = 'about' | 'errors' | null;
export type ChunkCmd = 'download' | 'delete' | null;
export type LoadBlorbAction = { filename:string, data:Uint8Array };

export type ModalForm = (
    null 
    | { type:'fetchchunk', key:number }
    | { type:'delchunk', key:number }
    | { type:'fetchblorb' }
    | { type:'addchunk' }
);

export const SelectionCtx = createContext(-1);
export const SetSelectionCtx = createContext((val:number) => {});

export const AltDisplayCtx = createContext(null as AltDisplay);
export const SetAltDisplayCtx = createContext((val:AltDisplay) => {});

export const ModalFormCtx = createContext(null as ModalForm);
export const SetModalFormCtx = createContext((val:ModalForm) => {});

export const BlorbCtx = createContext(new_blorb());
export const LoadBlorbCtx = createContext((act:LoadBlorbAction) => {});



