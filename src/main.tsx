import React from 'react';
import { useState } from 'react';
import { Root, createRoot } from 'react-dom/client';

let root: Root|null = null;

export function init()
{
    document.body.innerHTML = '<div id="app"></div>';
    const appel = document.getElementById('app') as HTMLElement;
    root = createRoot(appel);
    if (root)
        root.render( <MyApp /> );
}

function MyApp()
{
    const [count, setCount] = useState(1);
    
    function handleButtonClick()
    {
        console.log('### click');
        setCount(count + 1);
    }

    return (
        <div>
            <h1>Welcome to my app</h1>
            <MyButton count={ count } onClick={ handleButtonClick } />
            <MyList />
        </div>
    );
}

type MouseEv = React.MouseEventHandler<HTMLButtonElement>;

function MyButton({ count, onClick } : { count:number, onClick:MouseEv } )
{
    return (
        <button className="Button" onClick={ onClick }>
            Counter: { count }
        </button>
    );
}

const products = [
    { title: 'Cabbage', id: 1 },
    { title: 'Garlic', id: 2 },
    { title: 'Apple', id: 3 },
];

function MyList()
{
    const ells = products.map(product =>
        <li key={ product.id }>
            <em>{ product.id }</em>: { product.title }
        </li>
    );
    
    return (
        <ul>
            { ells }
        </ul>
    );
}
