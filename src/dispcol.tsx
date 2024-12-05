import React from 'react';

import { Chunk, Blorb } from './blorb';
import { pretty_size } from './readable';

export function DisplayChunk({ chunk } : { chunk:Chunk })
{
    return (
        <div>{ chunk.type.stype }</div>
    );
}

