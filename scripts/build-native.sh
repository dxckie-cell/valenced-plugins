#!/usr/bin/env bash
# Builds every native plugin (plugins/*/src/main) into plugins/*/prebuilt/plugin.jar, where
# scripts/package.mjs picks it up. Needs Java 25 (CI sets it up).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# The Valenced API is built from source, so no GitHub Packages token is needed.
api_dir="${RUNNER_TEMP:-/tmp}/valenced"
if [ ! -d "$api_dir" ]; then
	git clone --depth 1 https://github.com/Valenced/valenced.git "$api_dir"
fi
(cd "$api_dir" && ./gradlew --no-daemon :core:publishToMavenLocal :android:api:publishToMavenLocal)

for src in plugins/*/src/main; do
	[ -d "$src" ] || continue
	plugin_dir="$(dirname "$(dirname "$src")")"
	name="$(basename "$plugin_dir")"
	./gradlew --no-daemon ":plugins:$name:dexJar"
	mkdir -p "$plugin_dir/prebuilt"
	cp "$plugin_dir/build/outputs/plugin/plugin.jar" "$plugin_dir/prebuilt/plugin.jar"
done
