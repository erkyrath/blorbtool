import React from 'react';
import { useState, useReducer } from 'react';
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

type Product = { title:string, id:number };

function MyApp()
{
    const initialProducts = [
        { title: 'Cabbage', id: 1 },
        { title: 'Garlic', id: 2 },
        { title: 'Apple', id: 3 },
    ];
    
    const [count, setCount] = useState(1);
    const [products, dispProducts] = useReducer(reduceProducts, initialProducts);

    function handleButtonClick()
    {
        setCount(count + 1);
        dispProducts({ type:'add', product:{ title:'Thing', id:count+11 } });
    }

    return (
        <div>
            <h1>Welcome to my app</h1>
            <MyButton count={ count } onClick={ handleButtonClick } />
            <MyList ls={ products } />
        </div>
    );
}

function reduceProducts(products:Product[], act:any) : Product[]
{
    if (act.type == 'add') {
        return [ ...products, act.product ];
    }
    
    return products;
}

function MyButton({ count, onClick } : { count:number, onClick:MouseEv } )
{
    return (
        <button className="Button" onClick={ onClick }>
            Counter: { count }
        </button>
    );
}

function MyList({ ls } : { ls:Product[] } )
{
    const ells = ls.map(product =>
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

type MouseEv = React.MouseEventHandler<HTMLButtonElement>;

