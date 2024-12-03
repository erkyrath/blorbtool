import { Root, createRoot } from 'react-dom/client';

let root: Root|null = null;

export function init() {
    document.body.innerHTML = '<div id="app"></div>';
    const appel = document.getElementById('app') as HTMLElement;
    root = createRoot(appel);
    render();
}

export function render() {
    if (root)
        root.render(<h1>Hello, world</h1>);
}

export function render2() {
    if (root)
        root.render(<h1>Goodbye, world</h1>);
}
