# Parivaar Vault — Implementation Plan

Family document vault for Indian government IDs (Aadhaar, PAN, Voter ID/EPIC, Driving Licence, Passport) plus any other important document, with a DigiLocker-style card list → tap → fetched/extracted fields view.

Reference prototype (interaction, visual direction, field sets): https://claude.ai/artifact/BJWZhRA4x5tvPTCctdveFG

## Status (2026-10-21)

| Milestone                                                                                         | Status                      | Notes                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Scaffold: tokens, fonts, tabs, DocTypeRegistry, Home + Detail with 3D card and fetch animation | Done                        | `libs/shared/models/src/lib/doc-type.registry.ts`, `libs/shared/ui` (DocCard, DocCard3d, DocRow), `pv-feature-home`, `pv-feature-documents`                                                                                                                                                                                                                                                           |
| 2. Storage & lock                                                                                 | Done (Supabase + local key) | Supabase Auth for sign-up / sign-in (phone or email + password, SMS/email code when confirmation is on). The same password derives the local PBKDF2-SHA256 (310k) key that wraps the AES-256-GCM data key; the wrapped key is mirrored to a user-scoped `vault_keys` table so a second device can unlock. Offline sign-in verifies locally. See `supabase/README.md`. Biometric unlock is a follow-up |
| 3. Upload flow: capture, OCR, extractors, review                                                  | Done (basic capture)        | ML Kit on native, Tesseract.js on web, in `pv-ocr`. Guided camera-preview overlay is a follow-up                                                                                                                                                                                                                                                                                                      |
| 4. DigiLocker                                                                                     | Mock                        | `DigiLockerApi` interface + `MockDigiLockerApi`; real OAuth/PKCE flow pending partner credentials                                                                                                                                                                                                                                                                                                     |
| 5. Share/export/backup                                                                            | Done                        | Share image/PDF/text, encrypted JSON backup + restore                                                                                                                                                                                                                                                                                                                                                 |
| 6. Polish & QA                                                                                    | Partial                     | Reduced motion, dark mode, a11y labels done; device matrix and store assets pending                                                                                                                                                                                                                                                                                                                   |

Deviations from the original stack table: the workspace is Nx + Angular 22 + Ionic 9 + Capacitor 8 (newer than the Ionic 8 / Angular 18 / Capacitor 6 baseline in the plan); storage is IndexedDB rather than SQLCipher so the same code runs on web and native.

---

## 1. Goals and non-goals

**Goals**

- One vault, many family members. Each member has their own set of documents.
- Document cards rendered like the real card (Aadhaar tricolour, PAN blue, Passport navy…) in a list; tap opens a 3D card + "Document details" with every field extracted from the document.
- Two sources, shown in separate sections like DigiLocker: **Issued** (fetched from the issuer via DigiLocker APIs, digitally signed) and **Uploaded** (photo/PDF from the phone, fields read by on-device OCR, user-editable).
- Everything encrypted at rest on the device. Nothing leaves the phone unless the user shares.
- iOS, Android, Web (PWA) from one Ionic Angular codebase.

**Non-goals (v1)**

- No document sync: Supabase is used for accounts only (profile + wrapped key). Documents never leave the device.
- No Aadhaar eKYC / UIDAI direct integration (only via DigiLocker's issued-documents flow).

## 2. Data model

See `libs/shared/models/src/lib/models.ts` (`FamilyMember`, `VaultDocument` with `source`, `issuer`, `fields`, `files`) and `doc-type.registry.ts` (`DOC_TYPE_REGISTRY`: ordered fields, number key, mask, expiry key, number pattern per type).

| type     | numberKey       | mask                |
| -------- | --------------- | ------------------- |
| aadhaar  | Aadhaar Number  | `XXXX XXXX 1234`    |
| pan      | PAN             | `ABCDEXXXXF`        |
| voter    | EPIC Number     | first 3 + last 3    |
| dl       | DL Number       | state code + last 3 |
| passport | Passport Number | first + last char   |
| other    | Document Number | none                |

## 3. Screens and flows

- **Sign in / Create account** (`/auth`): family name, head name, +91 mobile, optional email, password with strength meter and confirm. Sign-up creates the Supabase user (then asks for the SMS or email code when confirmations are on) and the local vault. Sign-in authenticates with Supabase and unlocks the local vault with the same password; on a new device the wrapped key is fetched from `vault_keys`. Without Supabase credentials the app runs device-only. 5 failed local attempts start a growing 30 s back-off.
- **Member picker** (`/who`): "Who's using the <Family> vault?" grid with an inline add-member form; also reached from Switch.
- **Home** (`/home`): navy header with family name and avatar switch button, member hero (docs / expiring counts; Add doc, Share all, Edit member, Switch), member chips, Issued and Uploaded sections, staggered 3D row entrance, saffron FAB.
- **Document detail** (`/doc/:id`): three-step fetch sequence for issued documents (first open per session), 3D tilt/flip card, verification banner, registry-ordered fields, Copy / Share / Download PDF / Edit (uploaded only) / Remove with inline confirm.
- **Add document** (`/add`, `/doc/:id/edit`): member + type, capture (camera/photos/files), scan animation while OCR runs, review editable fields with low-confidence highlighting and number validation (Verhoeff for Aadhaar, PAN pattern), save.
- **Family** (`/family`): members with document counts, inline add form, edit/remove.
- **Settings** (`/settings`): signed-in account with sign out, change password, re-lock interval, DigiLocker link + import, theme, backup/restore, sample family, clear all data.
- **Layout**: mobile viewport only. One 480px column with bottom tabs; on wider screens the column is centred, no desktop sidebar.

## 4. Open decisions for the owner

- App id (`in.parivaarvault.app`?) and deep-link scheme for the DigiLocker OAuth callback.
- Which doc types must OCR well in v1 (Aadhaar + PAN first?).
- DigiLocker partner registration owner and timeline.
- Biometric unlock library choice for the native build.
