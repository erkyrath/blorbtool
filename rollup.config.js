import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

const release = false;
const nodeenv = (release ? 'production' : 'development')
const tersopt = { format: { ascii_only:true } };
const tersplugin = (release ? terser(tersopt) : null);

export default {
    input: 'lib/main.js',
    output: {
        file: 'js/bundle.js',
        name: 'bundle',
        format: 'iife'
    },
    plugins: [
        replace({
            'preventAssignment': true,
            'process.env.NODE_ENV': JSON.stringify(nodeenv)
        }),
        commonjs(),
        nodeResolve(),
        tersplugin,
    ]
}

