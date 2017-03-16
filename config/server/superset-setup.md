# Superset Installation

More details at <http://airbnb.io/superset/installation.html>.

Python3 preferred.

    cd /tagalog/nutmeg
    mkdir -p virtualenvs/superset
    virtualenv virtualenvs/superset/
    . virtualenvs/superset/bin/activate
    pip install --upgrade setuptools pip
    pip install superset
    fabmanager create-admin --app superset # create admin user
    superset db upgrade
    superset load_examples # just for test data if you need it, into ~/.superset/superset.db
    superset init
    superset runserver -p 9001

(Note that on an older machine with python 2 and 3, I had to install the `python3.4-venv` and `pip3` packages, and use `python3 -m venv -p python3 superset` instead of `virtualenv`.)

I moved db from `~/.superset/superset.db` to `/tagalog/nutmeg/superset/superset.db`

Flask App Builder version installed as dependency by pip seems not that up to date, I fixed flask deprecation warnings by grepping for them in `/tagalog/nutmeg/virtualenvs/superset/lib/python3.4/site-packages/flask*` and just replacing import names.

Nginx server blocks (everything is basic except the proxy pass with headers):

    server {
        listen 80;
        server_name  brain.headsoak.com;

        index index.html;
        root /var/www/headsoak;

        access_log   /var/log/nginx/brain.headsoak.com.access.log;
        error_log    /var/log/nginx/brain.headsoak.com.error.log;

        location /.well-known {
                allow all;
        }

        location / {
                return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name  brain.headsoak.com;

        ssl_certificate /etc/letsencrypt/live/brain.headsoak.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/brain.headsoak.com/privkey.pem;

        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        ssl_prefer_server_ciphers on;
        ssl_dhparam /etc/ssl/certs/dhparam.pem;
        ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA';
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_stapling on;
        ssl_stapling_verify on;
        add_header Strict-Transport-Security max-age=15768000;

        location / {
                proxy_pass http://0.0.0.0:9001$request_uri;
                proxy_set_header Host $host;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        access_log   /var/log/nginx/brain.headsoak.com.access.log;
        error_log    /var/log/nginx/brain.headsoak.com.error.log;
    }

Can set up file `superset_config.py` in PYTHONPATH. example: <https://github.com/airbnb/superset/blob/master/superset/config.py>. I put it in `/tagalog/nutmeg/superset/` and run `superset` from there.

Final command:

    cd /tagalog/nutmeg/superset; source ../virtualenvs/superset/bin/activate; superset runserver -p 9001

Upstart job to run this: put `config/server/upstart/superset.conf` from this repo into `/etc/init/` then do `sudo initctl reload-configuration` and `sudo start superset`.