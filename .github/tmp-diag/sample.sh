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
    if [ "$t" = --type=renderer ] && [ ! -e "$out.limits.$p" ]; then
      grep -E 'open files|address space' /proc/$p/limits > "$out.limits.$p"
      echo "$ts $p limits $(tr -s ' ' < "$out.limits.$p" | tr '\n' ' ')"
    fi
    if [ "$t" = --type=renderer ] && [ "$fds" -gt 15000 ] && [ ! -e "$out.kinds.$p" ]; then
      ls -l /proc/$p/fd | awk 'NR>1{print $NF}' | sed -E 's/[0-9]+/N/g' | sort | uniq -c | sort -rn | head -4 > "$out.kinds.$p"
      echo "$ts $p kinds $(tr -s ' ' < "$out.kinds.$p" | tr '\n' ' ')"
    fi
  done >> "$out"
  echo "$ts tmp $(df -k /tmp | tail -1 | awk '{print "usedKB=" $3, "availKB=" $4}') shm $(ls /tmp | grep -c org.chromium)" >> "$out"
  sleep 0.25
done
