# Contributing To Pill Happens

Pill Happens is a mobile-first medication journal. A useful contribution makes recording an intake quicker, the history clearer, or the interface easier to read and use.

The [Developer Guide](https://pill-happens.vercel.app/developer-guide) explains the theme, components, motion, artwork, and source structure. The [user guide](https://pill-happens.vercel.app/guide#start) explains the journal itself. Both pages live inside the signed-in app; repository access is required for private GitHub resources.

## Choose A Small, Reviewable Change

- [Report a bug](https://github.com/kingjulien1/pill-happens/issues/new?template=bug_report.yml) with the steps, expected result, and actual result.
- [Suggest an improvement](https://github.com/kingjulien1/pill-happens/issues/new?template=design_request.yml) around a concrete moment in the app.
- For a code change, create a focused branch and open a pull request that explains the resulting behavior. A draft is useful when the implementation is ready for early feedback.

Use invented medication names and sample entries in screenshots and reproduction steps. These make the problem reproducible without sharing a personal journal.

## Run A Local Copy

Use Node.js 22 or newer and the committed npm lockfile:

```sh
npm ci
npm run dev
```

The development server listens at `http://127.0.0.1:3000`. With no database or password configured, it uses ignored local files in `.data/` and the development sign-in bypass. A configured `DATABASE_URL` connects to that database; use an isolated development database when exercising persistence.

For authenticated local development, follow the environment setup in [README.md](README.md#run-locally). Keep generated environment values in local environment files rather than source changes.

Before changing a Next.js API, read the relevant installed guide in `node_modules/next/dist/docs/`, as required by [AGENTS.md](AGENTS.md).

## Work With The Design System

Start with the actual role a color plays, then use the existing semantic token. The application palette is defined in `src/lib/app-theme.ts`; generated CSS belongs in `src/app/theme.css`. Medication swatches and fixed-color tablet artwork have their own registries.

```sh
npm run theme:generate
npm run theme:check
```

Keep both system color modes readable. Check phone widths, centered content, keyboard focus, reduced motion, and touch behavior when changing an interactive component. Hover effects belong only inside the existing desktop/fine-pointer media queries.

Reuse the shared shadcn/Base UI components for controls and the responsive modal for mobile drawers and desktop dialogs. Keep application theme rules separate from the saved colors of medication artwork.

## Change Artwork And Generated Assets

Read the relevant catalog before adding a new symbol. Project SVGs use the same 24×24 coordinate system as the Lucide-style glyphs. Give every addition a stable ID, a readable label, useful search terms, and an explicit tintable or fixed-color variant.

Available generation checks:

```sh
npm run icons:tablets:check
npm run icons:app:check
npm run palette:check
npm run theme:check
```

When changing generated output, commit the source registry and the regenerated files together. Preserve the upstream attribution attached to adapted components.

## Verify The Behavior You Changed

Run the checks relevant to the change and describe the results in the pull request:

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Tests use Node's test runner with `tsx`; repository tests use an isolated PGlite engine. A visual change benefits from focused phone screenshots in light and dark mode. A state or calendar change needs coverage for the actual behavior, including the journal's timezone and 06:00 boundary where relevant.

Keep stored quantities, timestamps, and notes intact when changing presentation. Persistence changes should preserve older journals and handle concurrent saves through the existing repository mechanism.

## Write A Useful Pull Request

Lead with the problem and the resulting behavior. Include an example when it helps, a short description of the implementation, and the checks you ran. For a visible change, include representative screenshots. Explain any remaining limitation plainly.

The repository provides a [pull request template](.github/pull_request_template.md) and two [issue forms](.github/ISSUE_TEMPLATE). Keep commits focused, with a concrete title and enough detail to explain decisions that would otherwise be difficult to infer from the diff.

Source is on [GitHub](https://github.com/kingjulien1/pill-happens). The normal Vercel integration deploys updates pushed to the production branch; use a preview when reviewing a branch before publishing it.
