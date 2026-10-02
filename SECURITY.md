# Security

AVA handles confidential office information (projects, clients, contracts, invoices,
correspondence). The full security model is in
[docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

Key rules for anyone deploying or developing AVA:

* Never expose AVA to the Internet; use the Fortinet VPN for remote access.
* Keep `STRICT_LOCAL_MODE=true` unless the office explicitly decides otherwise.
* Never commit `.env`, certificates, backups or real office data.
* Use a separate development database and development OAuth credentials; never point a
  development checkout at production data.

## Reporting a problem
Report suspected vulnerabilities or data exposure privately to the office administrator.
Do not open public issues containing office data.
