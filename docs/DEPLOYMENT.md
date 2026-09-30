# Deployment

Target: the office server, Docker Compose, reachable at `https://ava.office.local` (or
another internal hostname) from the office LAN and via Fortinet VPN.

## 1. Prerequisites
* Linux server (Ubuntu 22.04/24.04 LTS recommended) with Docker Engine and Compose v2.
* Run `scripts/audit-environment.sh` first and fill in docs/ENVIRONMENT.md.
* Ports 80 and 443 free on the server (the audit lists listeners).
* 20 GB free disk minimum for AVA itself; add model weights (4–40 GB) and, from Phase 2,
  the document index (roughly 10–20% of indexed text volume).

## 2. Install
```bash
git clone <repository> /opt/ava && cd /opt/ava
scripts/setup.sh               # creates .env with generated secrets (never overwrites)
nano .env                      # AVA_HOSTNAME, AVA_BIND_ADDRESS, OFFICE_NAME, AI_* values
docker compose up -d --build   # add --profile local-ai to run Ollama on this server
scripts/create-admin.sh you@office.com "Your Name"
```
Check: `docker compose ps` shows api/db/redis/web healthy.

## 3. Internal DNS (manual — AVA does not change network infrastructure)
Create an A record in the office's internal DNS (Windows DNS / Active Directory, the
FortiGate DNS server, or the router):

```
ava.office.local.   A   <server LAN IP>
```

Notes:
* If the office domain is not `office.local`, use the real internal zone (e.g.
  `ava.firm.lan`) and set `AVA_HOSTNAME` accordingly.
* `.local` names can conflict with mDNS on macOS/iOS. If Apple devices fail to resolve,
  prefer a name under the office's AD zone or `.home.arpa`.
* VPN users must receive the internal DNS server through the Fortinet VPN settings
  (split DNS) so the name resolves remotely.

## 4. HTTPS certificates
Option A — **Caddy internal CA** (default, `AVA_TLS=internal`):
```bash
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt ./ava-root-ca.crt
```
Install `ava-root-ca.crt` as a trusted root on office devices (Group Policy / MDM /
manually on each device). Browsers then show a valid lock for AVA.

Option B — **office-issued certificate** (AD CS or another internal CA):
place `ava.crt` (full chain) and `ava.key` in `infrastructure/certs/`, set
`AVA_TLS=/certs/ava.crt /certs/ava.key`, and `docker compose up -d proxy`.

Do not disable certificate verification on devices as a workaround.

## 5. Fortinet / remote access
AVA requires no firewall changes for LAN use. For remote staff:
* Remote device → FortiClient VPN → office network → `https://ava.office.local`.
* Allow VPN users to reach the AVA server's LAN IP on TCP 443 (and 80 for redirect).
* Do **not** create a VIP / port-forward exposing AVA to the Internet.
* Optionally restrict which VLANs/user groups can reach AVA in FortiGate policy.
These changes are made by the office's network administrator; AVA does not modify
Fortinet configuration.

## 6. Local AI engine
See [AI.md](AI.md). Either run `docker compose --profile local-ai up -d` and pull a model:
```bash
docker compose exec ollama ollama pull llama3.1:8b-instruct-q4_K_M
```
or set `AI_BASE_URL` to an existing Ollama/vLLM server on the LAN (strict mode accepts
private addresses only).

## 7. Updates
```bash
scripts/backup.sh
git pull
docker compose up -d --build     # migrations run automatically on API start
```

## 8. Development mode
Use separate data and credentials:
```bash
docker compose -f docker-compose.dev.yml up -d   # ava_dev + ava_test databases on 127.0.0.1
```
See README → Development. Development `.env` values must never point at the production
database or production OAuth apps.
