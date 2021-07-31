#!/usr/bin/env bash

set -e

if [[ -z $(git status --porcelain=v1) ]];
then
	echo \"Starting test procedure\";
else
	echo \"Please commit all changes\";
	exit 1;
fi

node bin/chrome2i18next.js -i locales -o i18next_locales
node bin/i18next2chrome.js -i i18next_locales -o locales --i18next_format json
