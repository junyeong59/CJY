# CJY Site

Static developer website for `cjy.app`, based on the CJY PAGE Figma frames.

## Routes

- `/`
- `/portfolio`
- `/contact`
- `/musicnow`
- `/musicnow/privacy`
- `/musicnow/terms`
- `/musicnow/support`
- `/musicnow/join/:code`

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
