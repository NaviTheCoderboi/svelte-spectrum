import base from '@repo/eslint-config/index.js';

export default [
    ...base,
    {
        ignores: ['node_modules', 'eslint.config.js']
    }
];
