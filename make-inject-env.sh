#!/usr/bin/env bash

mkdir -p dist
INJECT_FILE_SRC=inject_template.js
INJECT_FILE_DST=dist/inject.js
env $(cat .env | xargs) envsubst < $INJECT_FILE_SRC > $INJECT_FILE_DST
