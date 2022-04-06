#!/usr/bin/env bash

./inject.bash
[ -z "$@" ] && npm run start || $@
