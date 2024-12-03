import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

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
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        commonjs(),
        nodeResolve(),
        //terser()
    ]
}

