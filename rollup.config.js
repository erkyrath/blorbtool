import terser from '@rollup/plugin-terser';

export default {
    input: 'lib/test.js',
    output: {
        file: 'js/bundle.js',
        name: 'bundle',
        format: 'iife'
    },
    plugins: [
        terser()
    ]
}

