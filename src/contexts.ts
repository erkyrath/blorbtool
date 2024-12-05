import { createContext } from 'react';

import { new_blorb } from './blorb';

export const SetSelectionCtx = createContext((val:number) => {});

export const BlorbCtx = createContext(new_blorb());
