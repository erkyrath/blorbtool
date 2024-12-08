import { createContext } from 'react';

import { new_blorb } from './blorb';

export type ChunkCmd = 'download' | 'delete' | null;
export type BlorbCmd = 'download' | 'addchunk' | null;

export const SetSelectionCtx = createContext((val:number) => {});

export const ChunkCmdCtx = createContext(null as ChunkCmd);
export const SetChunkCmdCtx = createContext((val:ChunkCmd) => {});

export const BlorbCmdCtx = createContext(null as BlorbCmd);
export const SetBlorbCmdCtx = createContext((val:BlorbCmd) => {});

export const BlorbCtx = createContext(new_blorb());
