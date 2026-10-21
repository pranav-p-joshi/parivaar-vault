# Pranav Nx Workspace

An [Nx](https://nx.dev) monorepo containing Angular applications and shared libraries.

## Projects

| Project                | Path                                    | Type        | Description                                                                                 |
| ---------------------- | --------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `parivaar-vault`       | `apps/parivaar-vault`                   | Ionic app   | App shell (mobile-only, phone-width column with bottom tabs), routing, theme, bundled fonts |
| `pv-feature-lock`      | `libs/parivaar-vault/feature-lock`      | Angular lib | Sign in / create account and the member picker                                              |
| `pv-feature-home`      | `libs/parivaar-vault/feature-home`      | Angular lib | Member hero with actions, chips, Issued and Uploaded document lists                         |
| `pv-feature-documents` | `libs/parivaar-vault/feature-documents` | Angular lib | Document detail (fetch sequence, 3D card, fields) and the add/scan/review flow              |
| `pv-feature-members`   | `libs/parivaar-vault/feature-members`   | Angular lib | Family members list, add and edit                                                           |
| `pv-feature-settings`  | `libs/parivaar-vault/feature-settings`  | Angular lib | Account, password, auto-lock, DigiLocker, theme, backup/restore, samples                    |
| `pv-data-access`       | `libs/parivaar-vault/data-access`       | Angular lib | Encryption, lock, IndexedDB storage, stores, backup, DigiLocker API + mock, sample data     |
| `pv-ocr`               | `libs/parivaar-vault/ocr`               | TS lib      | On-device OCR (ML Kit native, Tesseract.js web) and per-type field extractors               |
| `shared-models`        | `libs/shared/models`                    | TS lib      | Domain types and the DocTypeRegistry (`@pranav/shared-models`)                              |
| `shared-util`          | `libs/shared/util`                      | TS lib      | Dates (dd/mm/yyyy aware), validators incl. Verhoeff, file helpers                           |
| `shared-ui`            | `libs/shared/ui`                        | Angular lib | DocCard skins, 3D card, doc row, pill, field row, avatar, mask pipe                         |

Run `npx nx graph` to see how the projects depend on each other.

## How the app works

- **Plan and prototype**: `docs/PARIVAAR_VAULT_PLAN.md` holds the product plan with milestone status; the visual prototype it references is linked there.
- **Registry-driven**: everything a document type implies (card skin, ordered fields, number mask, expiry field, validation pattern) lives in `DOC_TYPE_REGISTRY`. UI, OCR extractors and the DigiLocker parsers read from it.
- **Issued vs uploaded**: issued documents come from DigiLocker (currently a mock behind the `DigiLockerApi` interface) and show a three-step fetch sequence the first time they are opened in a session. Uploaded documents are scanned on-device: ML Kit Text Recognition on Android/iOS, Tesseract.js on the web, then per-type regex and label-proximity extractors fill the fields for review.
- **Account and security**: sign-up and sign-in go through Supabase Auth (mobile or email + password; see `supabase/README.md` for setup and the SQL migration). The family account (family name, head, +91 mobile, optional email) is kept in Supabase `profiles` and locally. The password is never stored: a PBKDF2-SHA256 key (310k iterations) wraps a random AES-256-GCM data key, so a wrong password simply cannot decrypt. The wrapped key is mirrored to the user-scoped `vault_keys` table so a second device can unlock the same vault; Supabase never receives documents. With no Supabase URL and key in `apps/parivaar-vault/src/environments/`, the app runs device-only. Five failed local sign-ins start a growing back-off. Every file is encrypted before it is written to IndexedDB, the key only lives in memory while signed in, and the vault re-locks after a configurable time in the background. After sign-in a member picker scopes Home to one family member.
- **Storage**: IndexedDB via Dexie works in the browser and inside the Capacitor WebView, so one data layer serves web, Android and iOS.
- **Backups**: Settings exports a JSON file with the encrypted files and the wrapped key. Restoring asks for the PIN that was active when the backup was made.
- **Design**: dark-first tokens from the prototype (ink blues, saffron, gold, mint; Baloo 2 / Mukta / JetBrains Mono bundled via @fontsource) live in `apps/parivaar-vault/src/theme/`. Light mode follows the system preference or the Appearance setting. The layout targets the mobile viewport only. `design-system/parivaar-vault/MASTER.md` is the earlier UX guidance from the ui-ux-pro-max skill.

## Everyday commands

```sh
npx nx serve parivaar-vault      # dev server for the Ionic app (runs in the browser)
npx nx build <project>           # production build into dist/
npx nx test <project>            # Jest unit tests
npx nx lint <project>            # ESLint
npx nx run-many -t build lint test   # everything, for every project
npx nx affected -t build lint test   # only what changed since main
```

## Parivaar Vault (Ionic + Capacitor)

The native projects live in `apps/parivaar-vault/android` and `apps/parivaar-vault/ios`.
Capacitor is configured in `apps/parivaar-vault/capacitor.config.ts` and reads the web
bundle from `dist/apps/parivaar-vault/browser`.

```sh
npx nx run parivaar-vault:cap:sync          # build, copy web assets, update native plugins
npx nx run parivaar-vault:cap:open:android  # open in Android Studio
npx nx run parivaar-vault:cap:open:ios      # open in Xcode
npx nx run parivaar-vault:cap:run:android   # build, sync and run on a device/emulator
npx nx run parivaar-vault:cap:run:ios
npx nx run parivaar-vault:cap:add:ios       # re-add a native platform if it was removed
```

Capacitor plugins installed: `@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`,
`@capacitor/status-bar`. Add more with `npm install @capacitor/<plugin>` followed by `cap:sync`.

## Generating more projects

```sh
npx nx g @nx/angular:application apps/<name>            # another Angular app
npx nx g @nx/angular:library libs/<scope>/<name> --importPath=@pranav/<scope>-<name>
npx nx g @nx/angular:component <name> --project=<project>
```

Defaults for new Angular projects (SCSS, Jest, ESLint, no e2e) are set under
`generators` in `nx.json`.

## Notes

- `.npmrc` sets `legacy-peer-deps=true` to work around an npm 10.9 peer-resolution bug
  (`Cannot read properties of null (reading 'edgesOut')`) that breaks installs otherwise.
- The workspace uses the classic Nx integrated layout (`project.json` + `tsconfig.base.json`
  path aliases) because Angular does not support the TypeScript project-references setup.
- Jest in `apps/parivaar-vault` transforms the ESM output of `@ionic/angular`, `@ionic/core`,
  `@stencil/core` and `ionicons` (see `transformIgnorePatterns` in its `jest.config.cts`).
