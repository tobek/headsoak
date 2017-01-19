#!/bin/bash

# run e.g. with: nohup bash /home/ubuntu/nutmeg/util/watcher.sh > /dev/null &
# @HACK @TODO/util This should use upstart or something

until `node /home/ubuntu/nutmeg/util/watcher.js &>> /var/log/nutmeg/watcher.log`; do
    echo -e "\n\n`date`\nNutmeg watcher exited with status $?. Respawning...\n\n" >> /var/log/nutmeg/watcher.log
    sleep 0.1
done
