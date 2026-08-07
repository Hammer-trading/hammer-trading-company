This folder contains the latest local Next.js production build.

Build output:
- publish-build/.next

Netlify settings:
- Build command: npm run build
- Publish directory: .next
- Node version: 22

Important:
This is a dynamic Next.js app with API routes and server rendering.
For Netlify, the best path is to upload/connect the full project repository and let Netlify run npm run build.
If you only need to inspect the local production output, it is inside publish-build/.next.

Required production environment variables are listed in NETLIFY_DEPLOY.md in the project root.
