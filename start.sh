#!/bin/bash
PORT=${PORT:-4307} nohup node server.js > server.log 2>&1 &
