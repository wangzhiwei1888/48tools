import * as process from 'process';
import * as path from 'path';
import AntdDayjsWebpackPlugin from 'antd-dayjs-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const isDev: boolean = process.env.NODE_ENV === 'development';
const analyzer: boolean = process.env.ANALYZER === 'true';

// html代码压缩配置
const htmlWebpackPluginMinify: boolean | object = isDev ? false : {
  collapseWhitespace: true,
  keepClosingSlash: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: {
    ecma: 2020,
    safari10: true
  }
};

/**
 * 模块使用node的commonjs的方式引入
 * @param { Array<string> } node: node模块名称
 */
function nodeExternals(node: Array<string>): { [k: string]: string } {
  const result: { [k: string]: string } = {};

  for (const name of node) {
    result[name] = `globalThis.require('${ name }')`;
  }

  return result;
}

export default function(info: object): { [key: string]: any } {
  const plugins: Array<any> = [
    ['import', { libraryName: 'antd', libraryDirectory: 'es', style: true }]
  ];

  if (!isDev) {
    plugins.unshift(['transform-react-remove-prop-types', { mode: 'remove', removeImport: true }]);
  }

  const config: { [key: string]: any } = {
    frame: 'react',
    dll: [
      'react',
      'react-dom',
      'prop-types',
      '@reduxjs/toolkit',
      'react-redux',
      'reselect',
      'react-router',
      'react-router-dom',
      'history'
    ],
    entry: {
      index: [path.join(__dirname, 'src/index.tsx')],
      player: [path.join(__dirname, 'src/pages/48/Pocket48/Player/Player.tsx')]
    },
    html: [
      { template: path.join(__dirname, 'src/index.pug'), minify: htmlWebpackPluginMinify },
      { template: path.join(__dirname, 'src/pages/48/Pocket48/Player/player.pug'), minify: htmlWebpackPluginMinify }
    ],
    externals: nodeExternals([
      'child_process',
      'crypto',
      'fs',
      'net',
      'path',
      'process',
      'querystring',
      'stream',
      'url',
      'util',
      'zlib',
      '@electron/remote',
      'electron',
      'got',
      'puppeteer-core'
    ]),
    js: {
      ecmascript: true,
      plugins,
      exclude: /node_modules/i
    },
    ts: {
      configFile: isDev ? 'tsconfig.json' : 'tsconfig.prod.json',
      plugins,
      exclude: /node_modules/
    },
    sass: {
      include: /src/
    },
    css: {
      modifyVars: {
        // https://github.com/ant-design/ant-design/blob/master/components/style/themes/default.less
        '@primary-color': '#13c2c2'
      },
      include: /node_modules[\\/](_?antd|highlight)/,
      exclude: /dark-?theme/i
    },
    rules: [
      {
        test: /dark-theme\.(min\.)?css/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]' // TODO: js文件生成的hash和注入的hash不一致
        }
      }
    ],
    plugins: [new AntdDayjsWebpackPlugin()].concat(analyzer ? [new BundleAnalyzerPlugin()] : [])
  };

  return config;
}