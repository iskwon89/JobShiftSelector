#!/bin/sh
set -e

echo "Starting Couflex application..."

# Wait for database to be ready
echo "Waiting for database connection..."
until node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.connect()
  .then(() => { console.log('Database connected'); pool.end(); })
  .catch(() => { console.log('Database not ready yet...'); process.exit(1); });
" > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
npm run db:push

echo "Starting application server..."
exec "$@"