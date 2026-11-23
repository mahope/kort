# Security policy

## Supported versions

Only the current `main` branch, deployed at
[kort.mahoje.dk](https://kort.mahoje.dk) and [kort.solaris.dk](https://kort.solaris.dk),
receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue. Report it privately instead:

- through GitHub's [private vulnerability reporting](https://github.com/mahope/kort/security/advisories/new), or
- by email to **mads@mahoje.dk** with "kort security" in the subject.

Include the affected URL or file, steps to reproduce and the impact you see.
You will get a reply within a week. Please give us reasonable time to fix the
problem before you disclose it.

## Scope and known design choices

- The app has no accounts, no database and no user data on the server. Map
  settings, bookmarks and history live in the browser's localStorage.
- The Dataforsyningen and Adressevælger tokens in the client bundle are free,
  **public by design** tokens (see [docs/tokens.md](docs/tokens.md)). Their
  presence in the code or history is not a vulnerability.
- Security headers and the Content Security Policy are documented in
  [docs/security.md](docs/security.md); dependency policy in
  [docs/dependency-security.md](docs/dependency-security.md).
