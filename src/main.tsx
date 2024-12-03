import React from 'react';
import { useState, useReducer } from 'react';
import { Root, createRoot } from 'react-dom/client';

import { parse_blorb } from './parseblorb';

let root: Root|null = null;

export function init()
{
    const appel = document.getElementById('appbody') as HTMLElement;
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
    
    const [count, setCount] = useState(1+initialProducts.length);
    const [products, dispProducts] = useReducer(reduceProducts, initialProducts);

    function handleButtonClick()
    {
        dispProducts({ type:'add', product:{ title:'Thing', id:count } });
        setCount(count+1);
    }
    function handleDelClick()
    {
        dispProducts({ type:'del', index:0 });
    }

    return (
        <>
            <h1>Welcome to my app</h1>
            <AddButton count={ count } onClick={ handleButtonClick } />
            <DelButton onClick={ handleDelClick } />
            <MyList ls={ products } />
        </>
    );
}

function reduceProducts(products:Product[], act:any) : Product[]
{
    if (act.type == 'add') {
        return [ ...products, act.product ];
    }
    if (act.type == 'del') {
        let ls = [ ...products ];
        ls.splice(act.index, 1);
        return ls;
    }
    
    return products;
}

function AddButton({ count, onClick } : { count:number, onClick:MouseEv } )
{
    return (
        <button className="Button" onClick={ onClick }>
            Add product { count }
        </button>
    );
}

function DelButton({ onClick } : { onClick:MouseEv } )
{
    return (
        <button className="Button" onClick={ onClick }>
            Del first product
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

