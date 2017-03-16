# This file must by in PYTHONPATH when running superset.
#
# More config options: https://github.com/airbnb/superset/blob/master/superset/config.py

#---------------------------------------------------------
# Superset specific config
#---------------------------------------------------------
ROW_LIMIT = 5000
SUPERSET_WORKERS = 4

SUPERSET_WEBSERVER_PORT = 9001

ENABLE_PROXY_FIX = True

LOG_FORMAT = '%(asctime)s:%(levelname)s:%(name)s:%(message)s'
LOG_LEVEL = 'INFO'
ENABLE_TIME_ROTATE = False
TIME_ROTATE_LOG_LEVEL = 'INFO'
FILENAME = '/var/log/nutmeg/superset.log' # doesn't seem like this is being used, but that's ok cause we're logging with Upstart
ROLLOVER = 'midnight'
INTERVAL = 1
BACKUP_COUNT = 30

#---------------------------------------------------------

#---------------------------------------------------------
# Flask App Builder configuration
#---------------------------------------------------------
# Your App secret key
SECRET_KEY = 'ha ha yeah right this is different in production' # @CONFIG

# The SQLAlchemy connection string to your database backend
# This connection defines the path to the database that stores your
# superset metadata (slices, connections, tables, dashboards, ...).
# Note that the connection information to connect to the datasources
# you want to explore are managed directly in the web UI
#SQLALCHEMY_DATABASE_URI = 'sqlite:////home/ubuntu/.superset/superset.db'
SQLALCHEMY_DATABASE_URI = 'sqlite:////tagalog/nutmeg/superset/superset.db'

# Flask-WTF flag for CSRF
CSRF_ENABLED = True

# Set this API key to enable Mapbox visualizations
MAPBOX_API_KEY = ''