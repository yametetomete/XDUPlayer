const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const jsonminify = require('jsonminify');

const devMode = process.env.NODE_ENV !== 'production';

module.exports = {
	entry: "./Js/Main.js",
	externals: {
		Pixi: "PIXI"
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "./Css/[name].css",
			chunkFilename: "[id].css"
		}),
		new CopyWebpackPlugin([{
			from: './Js/Translations/**/*json',
			to: '.',
			transform: (fileContent, path) => {
				if (!devMode) {
					 return Promise.resolve(jsonminify(fileContent.toString()))
				}
				return Promise.resolve(fileContent);
			}
		},
		{
			from: './Js/Pixi.min.js',
			to: './Js/',
		},
		{
			from: './Images/',
			to: './Images/'
		}]),
		new HtmlWebPackPlugin({
			template: './Player.html',
			filename: './Player.html',
			minify: devMode ? false : {
				collapseWhitespace: true,
				removeComments: true,
				removeRedundantAttributes: true,
				removeScriptTypeAttributes: true,
				removeStyleLinkTypeAttributes: true,
				useShortDoctype: true
			}
		})
	],
	module: {
		rules: [
			{
				include: [path.resolve(__dirname, 'Js')],
				loader: 'babel-loader',

				options: {
					plugins: ['syntax-dynamic-import'],

					presets: [
						[
							'@babel/preset-env',
							{
								modules: false
							}
						]
					]
				},

				test: /\.js$/
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader"],
			},
			{	test: /\.woff2$/,
				loader: 'file-loader',
				options: {
					name: '[name].[ext]',
					outputPath: './Fonts/',
					publicPath: '/Fonts/',
				}
			}
		]
	},

	output: {
		chunkFilename: '[name].[chunkhash].js',
		filename: 'Js/XduPlayer.js',
		path: path.resolve(__dirname, 'Dist'),
		libraryTarget: 'var',
		library: 'XduPlayer'
	},

	devServer: {
		index: 'Player.html'
	},

	mode: devMode ? 'development' : 'production',

	optimization: {
		splitChunks: {
			cacheGroups: {
				vendors: {
					priority: -10,
					test: /[\\/]node_modules[\\/]/
				}
			},

			chunks: 'async',
			minChunks: 1,
			minSize: 30000,
			name: true
		}
	}
};
