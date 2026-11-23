#!/usr/bin/env bash
# Start the review server in the background: ./start.sh
cd "$(dirname "$0")" && PORT=${PORT:-4173} nohup node server.mjs > /tmp/a11y-server.log 2>&1 &
