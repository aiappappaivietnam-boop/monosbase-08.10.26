#!/bin/bash
nohup python3 -m http.server 3890 --bind 0.0.0.0 > server.log 2>&1 &
