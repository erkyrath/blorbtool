import { createRoot } from 'react-dom/client';

export function init() {
    document.body.innerHTML = '<div id="app"></div>';
    const appel = document.getElementById('app') as HTMLElement;
    const root = createRoot(appel);
    if (root)
        root.render(<h1>Hello, world</h1>);
}
