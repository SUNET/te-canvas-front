#!/usr/bin/env bash

INJECT_FILE_SRC="inject_template.js"
INJECT_FILE_DST="dist/inject.js"
envsubst < "${INJECT_FILE_SRC}" > "${INJECT_FILE_DST}"
