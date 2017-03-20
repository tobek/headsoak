When updating these on the server, run:

    git pull
    npm install

If necessary, any updates in `server/upstart` can then be applied like so:

    sudo cp server/upstart/*.conf /etc/init/
    sudo initctl reload-configuration
    sudo restart nutmeg-watcher
    sudo restart nutmeg-analytics
    sudo restart superset
