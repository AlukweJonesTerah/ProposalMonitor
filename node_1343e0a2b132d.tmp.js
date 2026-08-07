# Scriper Tester

This project now includes a simple Docker-based setup for running both a Python service and a Next.js web app without installing Node.js or Python packages on your machine.

## What is included

- A Next.js app served on port 3000
- A Python service running [proposal_monitor.py](proposal_monitor.py)
- A dedicated Python development container for iterative Python work
- Docker Compose orchestration for the web and Python services

## Prerequisites

Install Docker Desktop and make sure Docker is running on your machine.

## Run the project

From the project root, run:

```bash
docker compose up --build
```

This will start:

- the web app at http://localhost:3000
- the production Python container for the script

## Useful commands

Start in the background:

```bash
docker compose up -d --build
```

Stop everything:

```bash
docker compose down
```

Rebuild the web service:

```bash
docker compose build web
```

Rebuild the Python service:

```bash
docker compose build python
```

Rebuild the Python development service:

```bash
docker compose build python-dev
```

Run only the Python development container:

```bash
docker compose up python-dev
```

## Environment variables

The Python script can optionally write to Supabase if these environment variables are set:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
```

If they are not set, the script will skip the write step.

## Adding more packages

### Python

To add Python packages, update [requirements.txt](requirements.txt) and rebuild the appropriate Python container:

```bash
docker compose build python
docker compose up -d python
```

For the development Python container:

```bash
docker compose build python-dev
docker compose up -d python-dev
```

Example:

```txt
requests
pandas
```

### Next.js

If you are using Docker for the web app, you can manage Node.js packages from inside the running container:

```bash
docker compose exec web npm install <package_name>
docker compose exec web npm install
docker compose exec web npm list
docker compose exec web npm uninstall <package_name>
docker compose exec web npm update
```

You can also rebuild the web container after changing [package.json](package.json):

```bash
docker compose build web
docker compose up -d web
```

## Production build and run

Build the production image:

```bash
docker build -t nextjs-prod-app .
```

Run the production container:

```bash
docker run -p 3000:3000 nextjs-prod-app
```

## Project structure

- [proposal_monitor.py](proposal_monitor.py) - Python script
- [Dockerfile](Dockerfile) - production build for the web app
- [Dockerfile.dev](Dockerfile.dev) - development build for the web app
- [Dockerfile.python](Dockerfile.python) - production Python container build
- [Dockerfile.python.dev](Dockerfile.python.dev) - development Python container build
- [docker-compose.yml](docker-compose.yml) - container orchestration
- [package.json](package.json) - Next.js dependencies and scripts
