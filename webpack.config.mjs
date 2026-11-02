/// <reference types="node" />
import * as path from 'path';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const tsRule = {
    test: /\.ts$/,
    use: {
        loader: 'ts-loader',
        options: { configFile: path.resolve(__dirname, 'tsconfig.json') },
    },
};

const plugin = {
    name: 'plugin',
    target: 'node',
    context: __dirname,
    entry: './src/index.ts',
    devtool: false,
    mode: 'production',
    optimization: { minimize: true },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [tsRule] },
    node: { __dirname: false, __filename: false },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        libraryTarget: 'umd',
    },
    externals: [
        'fs',
        'path',
        'os',
        'net',
        'crypto',
        'child_process',
        'util',
        'events',
        'http',
        'https',
        'zone.js',
        'ngx-toastr',
        '@ng-bootstrap/ng-bootstrap',
        /^@angular\//,
        /^rxjs/,
        /^tabby-/,
        { electron: 'commonjs electron' },
    ],
};

const shim = {
    name: 'shim',
    target: 'node',
    context: __dirname,
    entry: './src/shim.ts',
    devtool: false,
    mode: 'production',
    optimization: { minimize: true },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [tsRule] },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'shim.js',
    },
};

const httpServer = {
    name: 'http-server',
    target: 'node',
    context: __dirname,
    entry: './src/http-server.ts',
    devtool: false,
    mode: 'production',
    optimization: { minimize: true },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [tsRule] },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'http-server.js',
    },
};

export default [plugin, shim, httpServer];
