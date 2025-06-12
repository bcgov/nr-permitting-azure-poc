# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the NR Permitting API project.

## Workflows

### 1. CI Tests (`ci-tests.yml`)

**Triggered on:**
- Push to `main` and `develop` branches
- Pull requests to `main` branch
- Changes to `src/**` files

**What it does:**
- Sets up Node.js 18 environment
- Starts PostgreSQL test database
- Installs dependencies
- Runs ESLint for code quality
- Builds TypeScript
- Runs Jest tests with coverage
- Uploads coverage reports to Codecov
- Archives test results as artifacts

### 2. Docker Build and Push (`docker-build-and-push.yml`)

**Triggered on:**
- Push to `main` and `develop` branches
- Pull requests to `main` branch (build only, no push)
- Release published
- Manual workflow dispatch

**What it does:**
- Builds multi-platform Docker image (linux/amd64, linux/arm64)
- Runs container smoke tests
- Pushes image to GitHub Container Registry (ghcr.io)
- Generates build attestation for security
- Runs Trivy security vulnerability scan
- Creates deployment summary

## Image Tags

The Docker image is tagged as follows:

- `latest` - Latest build from main branch
- `sha-<commit-sha>` - Specific commit
- `<branch-name>` - Branch builds
- `<version>` - Semantic version for releases
- `<major>.<minor>` - Major.minor version for releases
- `<major>` - Major version for releases

## Using the Docker Image

### Pull from GitHub Container Registry

```bash
# Pull latest image
docker pull ghcr.io/your-org/nr-permitting-azure-poc/nr-permitting-api:latest

# Pull specific version
docker pull ghcr.io/your-org/nr-permitting-azure-poc/nr-permitting-api:sha-abc1234
```

### Run the Container

```bash
# Basic run
docker run -p 3000:3000 ghcr.io/your-org/nr-permitting-azure-poc/nr-permitting-api:latest

# With environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_NAME=your-db-name \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e DB_SSL=true \
  ghcr.io/your-org/nr-permitting-azure-poc/nr-permitting-api:latest
```

### Health Check

The Docker image includes a built-in health check that monitors the `/health` endpoint:

```bash
# Check container health
docker ps
# Look for "healthy" status in the STATUS column
```

## Security Features

### Container Security
- Multi-stage build for minimal attack surface
- Non-root user execution
- Security updates applied during build
- Vulnerability scanning with Trivy

### Registry Security
- Images signed with build attestation
- Vulnerability scan results uploaded to GitHub Security tab
- SARIF format security reports

## Manual Workflow Triggers

### Docker Build and Push

You can manually trigger the Docker build workflow:

1. Go to Actions tab in GitHub
2. Select "Build and Push Docker Image"
3. Click "Run workflow"
4. Optionally choose whether to push to registry

## Environment Variables

The application expects these environment variables:

### Required
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Application port (default: 3000)
- `DB_SSL` - Enable SSL for database (default: false)
- `KEY_VAULT_URL` - Azure Key Vault URL
- `API_VERSION` - API version (default: v1)
- `LOG_LEVEL` - Logging level (default: info)

## Troubleshooting

### Build Failures

1. **Dependency Issues**: Check if `package-lock.json` is up to date
2. **Test Failures**: Ensure all tests pass locally first
3. **Docker Build Issues**: Verify Dockerfile syntax and build context

### Registry Issues

1. **Permission Denied**: Ensure `GITHUB_TOKEN` has package write permissions
2. **Image Not Found**: Check if the workflow completed successfully
3. **Pull Issues**: Verify you're authenticated with the registry

### Container Runtime Issues

1. **Health Check Failures**: Check application logs for startup errors
2. **Database Connection**: Verify database environment variables
3. **Port Conflicts**: Ensure port 3000 is available or map to different port

## Best Practices

1. **Always test locally** before pushing
2. **Use semantic versioning** for releases
3. **Monitor security scan results** in GitHub Security tab
4. **Keep dependencies updated** to reduce vulnerabilities
5. **Use specific image tags** in production deployments
