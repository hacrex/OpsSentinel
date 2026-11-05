#!/bin/sh
# generate-selfsigned.sh
# Generates a self-signed certificate if real Let's Encrypt certs don't exist yet.
# This ensures nginx can always start, even before certbot has run.
set -e

DOMAIN="${DOMAIN_NAME:-localhost}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
    echo "Generating self-signed certificate for ${DOMAIN}..."
    mkdir -p "${CERT_DIR}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${CERT_DIR}/privkey.pem" \
        -out "${CERT_DIR}/fullchain.pem" \
        -subj "/CN=${DOMAIN}"
    echo "Self-signed certificate generated."
else
    echo "Let's Encrypt certificate already exists for ${DOMAIN}."
fi
