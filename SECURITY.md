# Security

Do not include passwords, API keys, session cookies or member images in public issues. Contact the repository owner privately for suspected authentication, image-access or reward-integrity vulnerabilities.

Production deployments require private secrets, HTTPS, a private MongoDB replica set, protected persistent image storage and authenticated n8n callbacks. Public registrations receive only the member role. The admin seed script is an operator tool and can reset the configured account's password.

This repository includes basic rate limits and exact-file duplicate checks, not a complete anti-fraud or abuse-management system. See `docs/deployment.md` for multi-instance requirements and operational limits.
