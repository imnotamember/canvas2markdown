# Contributing to Canvas 2 Markdown

First off, thanks for taking the time to contribute! 🎉

The goal of this project is to provide a deterministic, clean, and lint-compliant Markdown converter for browser content.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report.
- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps which reproduce the problem** in as many details as possible.
- **Include the source HTML** (if possible) that caused the conversion error.

### Suggesting Enhancements

- **Use a clear and descriptive title** for the issue.
- **Describe the current behavior** and **explain the new behavior** you expect to see.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Run `npm run lint` to ensure your code follows the project's style.
5. Issue that pull request!

## Development Setup

1. `npm install` to install dependencies.
2. `npm run dev` to start the development server.
3. `npm run build` to build the distribution version.

## Style Guide

- We use **TypeScript** for type safety.
- We use **ESLint** for code quality. Please fix any errors before committing.
- Keep the logic for conversion separate from the UI components (clean architecture).

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
