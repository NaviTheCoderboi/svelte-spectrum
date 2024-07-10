import base from '@repo/eslint-config';

export default [
    ...base,
    {
        files: ['src/**/*.ts']
    },
    {
        ignores: ['dist', 'node_modules', 'eslint.config.js']
    }
];
