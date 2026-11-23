# Contributing

Thanks for wanting to help. Kort is a small, free tool maintained in spare
time, so small and focused changes are the easiest to land.

## Before you start

- **Bugs and ideas:** open an [issue](https://github.com/mahope/kort/issues)
  first, so we can agree on the approach before you write code. Issues may be
  written in Danish or English.
- **Security problems:** do not open a public issue; see [SECURITY.md](SECURITY.md).

## Development

```bash
cp .env.example .env.local   # optional, all variables have defaults
npm ci --ignore-scripts
npm run dev                  # http://localhost:3000
```

Requires Node.js 22 (same as the Dockerfile and CI).

Before you open a pull request, run the same checks as CI:

```bash
npm run lint
npm run typecheck
npx vitest run
npm run build
```

## Guidelines

- The UI text is Danish; code, identifiers and comments are English.
- Keep pull requests to one change. Add or update tests for logic in `src/lib/`.
- UI changes: include a screenshot (desktop and mobile) in the pull request.
- New map layer or data source: add it to `src/constants/dataSources.ts` with
  its licence and required credit. A test fails otherwise, and the credit must
  show on the map and in the PDF.
- New external domain: add it to the CSP in `next.config.ts`.
- Dependencies: pin exact versions and only adopt releases that are at least
  three days old (see [docs/dependency-security.md](docs/dependency-security.md)).
- Update the README in the same pull request when behaviour changes.

## Licence

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE). Data and fonts keep their own licences ([NOTICE.md](NOTICE.md)).

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
