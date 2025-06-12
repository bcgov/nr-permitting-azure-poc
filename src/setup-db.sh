#!/bin/bash

# Database setup script for NR Permitting API
# This script creates the required table if it doesn't exist

echo "🗄️  Setting up database schema..."

# Load environment variables
source .env

# Create the table if it doesn't exist
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS record (
    tx_id UUID NOT NULL PRIMARY KEY,
    version TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('RecordLinkage', 'ProcessEventSet')),
    system_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_kind TEXT NOT NULL CHECK (record_kind IN ('Permit', 'Project', 'Submission', 'Tracking')),
    process_event JSONB NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_record_system_record ON record(system_id, record_id);
CREATE INDEX IF NOT EXISTS idx_record_kind ON record(record_kind);
CREATE INDEX IF NOT EXISTS idx_record_process_event ON record USING GIN(process_event);
"

if [ $? -eq 0 ]; then
    echo "✅ Database schema setup completed successfully!"
else
    echo "❌ Database schema setup failed. Please check your connection settings."
    exit 1
fi
