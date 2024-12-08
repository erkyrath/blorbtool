import { createContext } from 'react';

import { new_blorb } from './blorb';

export type ChunkCmd = 'download' | 'delete' | null;

export const SetSelectionCtx = createContext((val:number) => {});

export const ChunkCmdCtx = createContext(null as ChunkCmd);
export const SetChunkCmdCtx = createContext((val:ChunkCmd) => {});

export const BlorbCtx = createContext(new_blorb());
