#!/usr/bin/env bash

set -e

node bin/chrome2i18next.js -i locales -o i18next_locales

if [[ -z $(git status --porcelain=v1) ]];
then
	echo \"chrome2i18next complete. Checking i18next2chrome…\";
else
	echo \"Please commit all changes before checking i18next2chrome\";
	exit 1;
fi

node bin/i18next2chrome.js -i i18next_locales -o locales --i18next_format json
