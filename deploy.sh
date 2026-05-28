#!/bin/bash
set -e

echo "==> Cidade Conectada — Deploy"

git pull origin main
docker compose up -d --build

echo "==> Deploy concluído!"
docker compose ps
