#!/usr/bin/env node

// Copyright © 2020, Octave Online LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const flatten = require("flat");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");

require("yargs")
	.scriptName("chrome2i18next")
	.usage("$0", "Converts from Chrome JSON to i18next translation bundles", (yargs) => {
		yargs.option("in_dir", {
			alias: "i",
			demandOption: true,
			requiresArg: true,
			describe: "Input directory containing Chrome JSON files",
		})
		.option("out_dir", {
			alias: "o",
			demandOption: true,
			requiresArg: true,
			describe: "Output directory containing i18next files",
		})
		.option("i18next_format", {
			// TODO: Consider adding YAML output format
			choices: ["json"],
			default: "json",
			describe: "i18next file format",
		})
		.option("locales", {
			alias: "l",
			array: true,
			describe: "Locales to export (if not specified, convert all locales in the directory)",
		})
	}, main)
	.help()
	.argv;

function sortedMut(arr) {
	arr.sort();
	return arr;
}

async function main(args) {
	// Get list of locales
	let locales;
	if (args.locales) {
		locales = args.locales;
	} else {
		locales = [];
		const re = new RegExp("^(\\w+)\\.json");
		const filenames = await fs.promises.readdir(args.in_dir);
		for (let filename of filenames) {
			let match;
			if (match = re.exec(filename)) {
				locales.push(match[1]);
			}
		}
	}
	if (locales.length === 0) {
		throw new Error("Found no locales in input directory");
	}

	// Create output directory if necessary
	await mkdirp(args.out_dir);

	// Transform each locale and dump to output directory
	for (let locale of locales) {
		const chromePath = path.join(args.in_dir, locale + ".json");
		const rawChromeStrings = await fs.promises.readFile(chromePath, "utf-8");
		const chromeStrings = JSON.parse(rawChromeStrings);
		const flatStrings = {};
		for (let key of sortedMut(Object.keys(chromeStrings))) {
			flatStrings[key] = chromeStrings[key].message;
		}
		const nestedStrings = flatten.unflatten(flatStrings);
		const rawNestedStrings = JSON.stringify(nestedStrings, null, "\t");
		const outPath = path.join(args.out_dir, locale + "." + args.i18next_format);
		await fs.promises.writeFile(outPath, rawNestedStrings, "utf-8");
	}
}
