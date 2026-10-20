# Pranav Nx Workspace

An [Nx](https://nx.dev) monorepo containing Angular applications and shared libraries.

## Projects

| Project          | Path                  | Type        | Description                                              |
| ---------------- | --------------------- | ----------- | -------------------------------------------------------- |
| `parivaar-vault` | `apps/parivaar-vault` | Ionic app   | "Parivaar Vault" mobile app: Angular + Ionic + Capacitor |
| `shared-ui`      | `libs/shared/ui`      | Angular lib | Shared UI components, imported as `@pranav/shared-ui`    |

Run `npx nx graph` to see how the projects depend on each other.

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
