# VirgoX security policy

## Reporting a vulnerability

Do not open a public issue for a suspected security vulnerability. Contact the repository owner privately with a reproducible description, affected route or component, impact, and suggested mitigation.

## Required pre-launch checks

- Run secret scanning across the working tree and Git history.
- Rotate credentials that were ever hardcoded or shared in local files.
- Confirm no service-role, database, OAuth, JWT, or private storage credential is exposed to browser bundles.
- Check all authenticated procedures for ownership, visibility, and role enforcement.
- Keep media private until the server-side file type, size, and malware checks finish.
- Use signed or platform-managed storage paths; do not expose raw storage credentials.
- Redact emails, tokens, passwords, storage keys, and other PII from logs and error responses.
- Apply rate limits to authentication, search, comments, messaging, reports, and uploads.
- Use security headers, TLS database connections, restricted CORS, generic client errors, and correlation IDs in production.
- Re-run the attacker-perspective review after every major feature update.

## Sensitive attachment warning

A local OAuth JSON attachment was supplied during project setup. Its credentials were intentionally not copied into this repository. Any credentials contained in that file or previously committed elsewhere should be revoked and rotated before use.
