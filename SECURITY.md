
---

# `SECURITY.md`

```md
# Security Policy

This repository is used only for collecting hackathon project submissions.

Participants should not add sensitive information to this repository or to their public project repositories.

---

## Do Not Commit Secrets

Please do not commit:

- API keys
- Access tokens
- Passwords
- Private credentials
- `.env` files
- Database connection strings
- Cloud service credentials
- Personal identification documents
- Any confidential business data

---

## If You Accidentally Commit a Secret

If you accidentally commit a secret:

1. Remove it from your repository immediately.
2. Rotate or revoke the exposed key/token from the provider dashboard.
3. Update your project with a safe placeholder value.
4. Inform the organizers if the secret was committed to this repository.

---

## Recommended Practice

Use environment variables for local development.

Example:

```txt
OPENAI_API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
