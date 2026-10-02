# Certificates

Place an office-issued certificate here if you do not use Caddy's internal CA:

- `ava.crt` — certificate (full chain) for the AVA hostname
- `ava.key` — private key

Then set `AVA_TLS=/certs/ava.crt /certs/ava.key` in `.env`. These files are ignored by
Git and must never be committed. See `docs/DEPLOYMENT.md`.
