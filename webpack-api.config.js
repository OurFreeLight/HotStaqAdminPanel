const webpack = require ("webpack");
const CopyPlugin = require ("copy-webpack-plugin");

const fs = require ("fs");
const ppath = require ("path");

const packageStr = fs.readFileSync (process.cwd () + "/package.json").toString ();
const packageJSON = JSON.parse (packageStr);
let packageVersion = packageJSON.version.toString ();

module.exports = {
		entry: "./src/WebExport.ts",
		devtool: "inline-source-map",
		target: "web",
		module: {
			rules: [{
					test: new RegExp ("\.tsx?$"),
					use: [{
							loader: "ts-loader",
							options: {
									transpileOnly: true,
									configFile: "tsconfig-web.json"
								}
						}],
					exclude: /node_modules/
				}]
		},
		plugins: [
			new webpack.DefinePlugin ({
					__VERSION__: `\"${packageVersion}\"`
				}),
			new CopyPlugin ({
					patterns: [
							{ from: `${process.cwd ()}/build-web/admin-panel.js`, 
							to: `${process.cwd ()}/public/js/admin-panel.js` }
						]
				})
		],
		resolve: {
			extensions: [".tsx", ".ts", ".js"]
		},
		node: {
			fs: "empty",
			crypto: "empty",
			stream: "empty",
			Utils: "empty"
		},
		externals: {
			hotstaq: "HotStaqWeb",
			'datatables.net': 'DataTable',
			'datatables.net-bs5': 'dt5',
			'datatables.net-colreorder-bs5': 'dtc',
			'datatables.net-scroller-bs5': 'dts',
			'datatables.net-searchbuilder-bs5': 'dtsb',
			'datatables.net-select-bs5': 'dtsel'
		},
		output: {
			filename: "admin-panel.js",
			path: ppath.resolve (process.cwd (), "build-web"),
			library: "admin-panelWeb",
			libraryTarget: "umd"
		}
	};
