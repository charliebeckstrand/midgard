#!/bin/bash
# Temporary diagnostic: sample each Chromium process 4 times a second.
out=$1
while true; do
  ts=$(date +%T.%N | cut -c1-12)
  for p in $(pgrep -f 'chrome-headless-shell|chrome-linux|/chrome '); do
    cmd=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null)
    t=$(grep -o -- '--type=[a-z-]*' <<< "$cmd" | head -1); [ -z "$t" ] && t=--type=browser
    u=$(grep -o -- '--utility-sub-type=[a-zA-Z.]*' <<< "$cmd" | head -1)
    fds=$(ls /proc/$p/fd 2>/dev/null | wc -l)
    maps=$(wc -l < /proc/$p/maps 2>/dev/null)
    rss=$(awk '/VmRSS/ {print $2}' /proc/$p/status 2>/dev/null)
    thr=$(awk '/Threads/ {print $2}' /proc/$p/status 2>/dev/null)
    echo "$ts $p ${t#--type=}${u#--utility-sub-type=} fds=$fds maps=$maps rssKB=$rss threads=$thr"
  done >> "$out"
  sleep 0.25
done
