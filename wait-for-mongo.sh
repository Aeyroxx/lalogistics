#!/bin/bash
# wait-for-mongo.sh - Wait for MongoDB to be ready

set -e

host="$1"
shift
cmd="$@"

until mongosh --host "$host" --eval "db.adminCommand('ping')" --quiet; do
  >&2 echo "MongoDB is unavailable - sleeping"
  sleep 2
done

>&2 echo "MongoDB is up - executing command"
exec $cmd
