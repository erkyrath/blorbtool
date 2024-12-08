import { createContext } from 'react';

import { Blorb, new_blorb } from './blorb';

export type AltDisplay = 'about' | 'errors' | null;
export type ChunkCmd = 'download' | 'delete' | null;
export type BlorbCmd = 'download' | 'addchunk' | null;
export type LoadBlorbAction = { filename:string, data:Uint8Array };

export const SelectionCtx = createContext(-1);
export const SetSelectionCtx = createContext((val:number) => {});

export const AltDisplayCtx = createContext(null as AltDisplay);
export const SetAltDisplayCtx = createContext((val:AltDisplay) => {});

export const ChunkCmdCtx = createContext(null as ChunkCmd);
export const SetChunkCmdCtx = createContext((val:ChunkCmd) => {});

export const BlorbCmdCtx = createContext(null as BlorbCmd);
export const SetBlorbCmdCtx = createContext((val:BlorbCmd) => {});

export const BlorbCtx = createContext(new_blorb());
export const LoadBlorbCtx = createContext((act:LoadBlorbAction) => {});



