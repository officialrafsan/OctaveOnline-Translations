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
const yaml = require("js-yaml");

require("yargs")
	.scriptName("i18next2chrome")
	.usage("$0", "Converts from i18next to Chrome JSON translation bundles", (yargs) => {
		yargs.option("in_dir", {
			alias: "i",
			demandOption: true,
			requiresArg: true,
			describe: "Input directory containing i18next files",
		})
		.option("out_dir", {
			alias: "o",
			demandOption: true,
			requiresArg: true,
			describe: "Output directory containing Chrome JSON files",
		})
		.option("i18next_format", {
			// TODO: Consider adding JSON output format
			choices: ["yaml"],
			default: "yaml",
			describe: "i18next file format",
		})
		.option("locales", {
			alias: "l",
			array: true,
			describe: "Locales to export (if not specified, convert all locales in the directory)",
		})
		.option("overwrite", {
			alias: "W",
			describe: "Overwrite the Chrome JSON file, rather than merge",
		})
	}, main)
	.help()
	.argv;

function sorted(set) {
	const arr = [...set];
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
		const re = new RegExp("([\\w\\-]+)\\." + args.i18next_format);
		const filenames = await fs.promises.readdir(args.in_dir);
		for (let filename of filenames) {
			let match;
			if (match = re.exec(filename)) {
				if (match[1] === "qqq") {
					// Description file
					continue;
				}
				locales.push(match[1]);
			}
		}
	}

	// Load descriptions if available
	const descFilename = "qqq." + args.i18next_format;
	let descriptions;
	try {
		const descPath = path.join(args.in_dir, descFilename);
		const rawDescriptions = await fs.promises.readFile(descPath, "utf-8");
		descriptions = flatten(yaml.safeLoad(rawDescriptions));
	} catch (e) {
		console.error("Note: descriptions not found in " + descriptionFilename);
	}

	// Create output directory if necessary
	await mkdirp(args.out_dir);

	// Transform each locale and dump to output directory
	for (let locale of locales) {
		const chromePath = path.join(args.out_dir, locale + ".json");
		let oldChromeStrings = {};
		if (!args.overwrite) {
			const oldRawChromeStrings = await fs.promises.readFile(chromePath, "utf-8");
			oldChromeStrings = JSON.parse(oldRawChromeStrings);
		}
		const i18nextLocalePath = path.join(args.in_dir, locale + "." + args.i18next_format);
		const rawLocaleStrings = await fs.promises.readFile(i18nextLocalePath, "utf-8");
		const localeStrings = flatten(yaml.safeLoad(rawLocaleStrings));
		const allKeys = new Set(Object.keys(localeStrings).concat(Object.keys(oldChromeStrings)));
		const chromeStrings = {};
		for (let key of sorted(allKeys)) {
			if (descriptions && !descriptions[key] && !oldChromeStrings[key]) {
				throw new Error("Missing description for key " + key);
			}
			chromeStrings[key] = Object.assign({}, oldChromeStrings[key]);
			if (localeStrings[key]) {
				chromeStrings[key].message = localeStrings[key];
			}
			if (descriptions[key]) {
				chromeStrings[key].description = descriptions[key];
			}
		}
		const rawChromeStrings = JSON.stringify(chromeStrings, null, "  ");
		await fs.promises.writeFile(chromePath, rawChromeStrings, "utf-8");
	}
}
