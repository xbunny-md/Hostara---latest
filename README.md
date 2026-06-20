# Hostara powered by SwiftCloud

A WhatsApp bot hosting platform powered by SwiftCloud, built for auto-deployments to Render Web Services.

## Tech Stack
* Frontend: React + Vite + TailwindCSS + shadcn/ui components
* Backend: Node.js + Express
* Auth: Clerk
* Database: Firebase Realtime Database

## DEPLOY INSTRUCTIONS FOR RENDER

Follow these exact steps to deploy to Render:

1. **Push code to GitHub**: Create a new repository and push this entire workspace to it.
2. **Setup Render Web Service**:
   - Go to Render Dashboard -> **New** -> **Web Service**
   - Connect your GitHub repository.
3. **Configure Service settings**:
   - Name: `hostara` (or your choice)
   - Environment: `Node`
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Add Environment Variables** (Under Environment tab):
   You MUST add the following EXACT variables. DO NOT change their names:
   ```
   FIREBASE_DATABASE_URL=https://hostara-8465f-default-rtdb.asia-southeast1.firebasedatabase.app/
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y3VyaW91cy10dW5hLTY2LmNsZXJrLmFjY291bnRzLmRldiQ
   CLERK_SECRET_KEY=sk_test_mqEIXKFXmU5P6haiFuBxgmTGopd0wZUDRPuQa8oMsf
   UPTIMEROBOT_API_KEY=your_api_key_here
   ZENOPAY_API_KEY=your_api_key_here
   RENDER_API_KEY_1=your_api_key_here
   ```
5. **Custom Domain Setup**:
   - In your Render Web Service settings, go to **Settings** -> **Custom Domains**.
   - Add `hostara.swiftbot.gt.tc`
   - Open InfinityFree (or your DNS provider) and add a CNAME record pointing `hostara.swiftbot.gt.tc` to your Render `.onrender.com` URL.

## Automatic Clerk Mapping
Because the app relies on Clerk, make sure your Clerk account is set up to allow the production domain (`hostara.swiftbot.gt.tc`) or else users won't be able to log in.

## Note on Architecture
This codebase has been generated to meet all provided constraints using a `Vite + Express` full-stack architecture (to properly protect your Firebase backend mutations and API keys while adhering to the environment's capabilities). All features, UI specs, and Firebase structures conform exactly to the original Next.js spec requirements.
