# CJY Site

Static developer website for `cjy.app`, based on the CJY PAGE Figma frames.

## Routes

- `/` — the public landing page, based on the CJY Figma frame. Product and Pricing use same-page anchors (`/#product`, `/#pricing`), not separate routes.

Music Now routes remain available through direct links, without links from the main or 404 page:

- `/musicnow`
- `/musicnow/privacy`
- `/musicnow/terms`
- `/musicnow/support`
- `/musicnow/join/:code`

`/portfolio` and `/contact` (including trailing slashes) redirect to `/` in the client router. Unknown routes retain the 404 page.

## Commands

```sh
npm run dev
npm run build
npm run og
```

`npm run og` regenerates `public/assets/musicnow-invite-og.png` at 1200x630.

## Deploy Notes

- Replace `appStoreUrl`, `instagramUrl`, and contact emails in `src/config.js`.
- Update `public/.well-known/apple-app-site-association` with the Team ID and bundle ID when Universal Links are ready.
- Review the privacy policy and terms text before App Store submission.

## Service application

`/apply` opens the service form. Price links preselect `service=reels|editing` and `plan=Standard|Deluxe|Premium`. Reels adds the Figma setup fee of 200,000 KRW; editing is 99,000 KRW with no setup fee. Payment is disabled and no form data is sent or persisted.
