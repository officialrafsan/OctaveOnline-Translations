#!/usr/bin/env node

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
		const re = new RegExp("(\\w+)\\." + args.i18next_format);
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
		const localePath = path.join(args.in_dir, locale + "." + args.i18next_format);
		const rawLocaleStrings = await fs.promises.readFile(localePath, "utf-8");
		const localeStrings = flatten(yaml.safeLoad(rawLocaleStrings));
		const chromeStrings = {};
		for (let key of sortedMut(Object.keys(localeStrings))) {
			chromeStrings[key] = {
				message: localeStrings[key],
				description: descriptions[key],
			};
		}
		const rawChromeStrings = JSON.stringify(chromeStrings, null, "  ");
		const chromePath = path.join(args.out_dir, locale + ".json");
		await fs.promises.writeFile(chromePath, rawChromeStrings, "utf-8");
	}
}
