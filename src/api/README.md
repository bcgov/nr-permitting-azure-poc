# nr-permitting-api

A simple TypeScript API that connects to PostgreSQL at startup, creates a demo table and row, and exposes a GET endpoint to retrieve the row.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Run

```bash
npm start
```

## Docker

```bash
docker build -t nr-permitting-api .
docker run --env-file .env -p 3000:3000 nr-permitting-api
```

## Environment Variables

- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD
- DB_SSL_MODE
- DB_CONNECTION_TIMEOUT
- DB_POOL_MIN
- DB_POOL_MAX
- NODE_ENV
- PORT
