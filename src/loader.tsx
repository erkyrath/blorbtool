import React from 'react';

import { AboutPane } from './about';

export function LoaderIndex()
{
    return (
	<div>Welcome.</div>
    );
}

export function LoaderDisplay()
{
    return (
	<>
            <div className="DisplayHeader">
	    </div>
            <div className="DisplayPane">
		<AboutPane />
	    </div>
	</>
    );
}
