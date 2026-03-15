# Deployment Guide

This repo has three deployable parts:

1. `frontend/`: Vite frontend
2. `backend/`: main API
3. `backend/email-micro-services/`: email service

## Recommended simple setup

- Frontend: Vercel or Render static site
- API: Render web service
- Email microservice: Render web service
- Database: MongoDB Atlas

## Environment files

Use these templates before deploying:

- Frontend: [`.env.example`](./frontend/.env.example)
- API: [`backend/.env.example`](./backend/.env.example)
- Email microservice: [`backend/email-micro-services/.env.example`](./backend/email-micro-services/.env.example)

Do not commit real secrets.

## Frontend

Required env:

- `VITE_API_BASE_URL`

Example:

```env
VITE_API_BASE_URL=https://bookingproject-api.onrender.com
```

If deploying on Vercel, [`vercel.json`](./vercel.json) already rewrites SPA routes to `index.html`.

## API

Required env:

- `NODE_ENV=production`
- `PORT=5000`
- `DBSTRING`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `EMAIL_MICROSERVICE_URL`
- `EMAIL_VERIFICATION_URL`

Optional depending on enabled features:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `PAYSTACK_CALLBACK_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER`

Health check:

- `/api/health`

## Email microservice

Required env:

- `NODE_ENV=production`
- `PORT=5100`
- `ALLOWED_ORIGINS`
- `EMAIL_SERVICE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

Optional:

- `MONGO_URI` if you want persistent email logs

Health check:

- `/api/health`

## MongoDB Atlas

Create at least one cluster and allow access from your deploy platform.

Suggested:

- one database for the main API
- one database for the email service logs, or reuse the same cluster with a different database name

## Render

[`render.yaml`](./render.yaml) is included for:

- `bookingproject-api`
- `bookingproject-email-ms`
- `bookingproject-web`

After creating the Blueprint on Render, fill all `sync: false` environment variables in the dashboard.

## Deployment order

1. Deploy MongoDB Atlas
2. Deploy email microservice
3. Deploy API with `EMAIL_MICROSERVICE_URL` pointing at the email service
4. Deploy frontend with `VITE_API_BASE_URL` pointing at the API
5. Update `ALLOWED_ORIGINS`
   API should allow the frontend URL
   Email microservice should allow the API URL

## Smoke test after deploy

1. Open frontend
2. Register or log in
3. Load dashboard
4. Open `/api/health` on the API
5. Open `/api/health` on the email microservice
6. Create a booking
7. Trigger a reminder email from the appointments page
8. Verify the public booking page works

## Notes

- The API now starts only after the database connection succeeds.
- CORS is controlled by `ALLOWED_ORIGINS`.
- If `ALLOWED_ORIGINS` is blank, CORS is effectively open. Set it in hosted environments.
