# 🐦 HungryBirds: Food Delivery for Dharwad & Hubli

[![CI](https://github.com/SHARMI-P/hungrybirds/actions/workflows/ci.yml/badge.svg)](https://github.com/SHARMI-P/hungrybirds/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

HungryBirds is a full-stack, real-time food delivery platform built around one city pair: **Dharwad and Hubli, Karnataka**. It has three roles that work together live:

- **🍔 Customers** find nearby restaurants, order now or schedule for later, pay with Razorpay or cash, chat with their rider and watch them move on a map.
- **🛵 Riders** go online, get the nearest order assigned automatically, share live GPS, and mark pickup and delivery.
- **⚙️ Admins** manage restaurants, menus, riders and coupons, move orders through the kitchen, and watch every rider on a live map with an analytics dashboard.

The app works in **English and ಕನ್ನಡ (Kannada)**.

---

## 📑 Contents

1. [Live demo](#-live-demo)
2. [Demo accounts](#-demo-accounts)
3. [Try the full flow in 5 minutes](#-try-the-full-flow-in-5-minutes)
4. [Features](#-features)
5. [Tech stack](#-tech-stack)
6. [Architecture](#-architecture)
7. [How key parts work](#-how-key-parts-work)
8. [Security](#-security)
9. [Project structure](#-project-structure)
10. [Run it locally](#-run-it-locally)
11. [Environment variables](#-environment-variables)
12. [Useful scripts](#-useful-scripts)
13. [Deployment](#-deployment)
14. [API reference](#-api-reference)
15. [Testing](#-testing)
16. [Troubleshooting](#-troubleshooting)
17. [Roadmap](#-roadmap)

---

## 🌐 Live demo

| App | Link | Who uses it |
|---|---|---|
| Customer + Rider app | **[hungrybirds-gamma.vercel.app](https://hungrybirds-gamma.vercel.app)** | Customers and delivery riders |
| Admin panel | **[hbadmin.vercel.app](https://hbadmin.vercel.app)** | Admin only |
| API + interactive docs | **[hungrybirds-backend.onrender.com/api/docs](https://hungrybirds-backend.onrender.com/api/docs)** | Developers |

> ⏳ The API runs on Render's free tier and sleeps when unused. The **first request can take about 50 seconds**. If you see "Cannot reach the server", wait a moment and refresh.

---

## 🔑 Demo accounts

Riders and customers sign in on the **customer app** ([hungrybirds-gamma.vercel.app/login](https://hungrybirds-gamma.vercel.app/login)). The app recognises rider accounts and opens the rider screen automatically.

### Customer

| Name | Email | Password |
|---|---|---|
| Ravi Kumar | `test@test.com` | `Demo@12345` |

You can also **register a new account**, or use **📱 Phone OTP**: enter any 10-digit Indian mobile number and the demo code appears on screen (no SMS is sent).

### Riders

All riders share the password **`Rider@12345`**.

| Rider | Email | Vehicle | Usually serves | Starts |
|---|---|---|---|---|
| Raju K | `raju@hb.com` | Bike KA25AB1234 | Dharwad | 🟢 Online |
| Priya M | `priya@hb.com` | Scooter KA25CD5678 | Dharwad | 🟢 Online |
| Suresh B | `suresh@hb.com` | Bike KA25EF9012 | Hubli | 🟢 Online |
| Kavya R | `kavya@hb.com` | Scooter KA25GH3456 | Hubli | 🟢 Online |
| Mahesh T | `mahesh@hb.com` | Bike KA25IJ7890 | Hubli | ⚫ Offline |

> Orders go to the **nearest free rider**. To find out who got an order, look at "Your delivery partner" on the customer's tracking page, or the **Orders** / **🗺️ Live map** tabs in the admin panel.

### Admin

| Email | Password |
|---|---|
| `admin@hungrybirds.com` | *Private, held by the project owner* |

> 🔒 The admin password is deliberately **not** published, because the admin can delete restaurants and see customer details. When running locally, you choose it yourself with `SEED_ADMIN_PASSWORD` (see [Run it locally](#-run-it-locally)).

> ℹ️ The customer and rider accounts above are **demo accounts** with sample data. Please don't enter real personal information.

---

## 🎬 Try the full flow in 5 minutes

You need three browser windows. Use normal + Incognito, or two different browsers.

1. **Customer** (window 1): log in as `test@test.com`.
   - Press **🌐 ಕನ್ನಡ** to see the Kannada interface, then switch back.
   - Search `biriyani` (spelling mistakes are fine) or open **Hotel Shree Renuka**.
   - Add items, open the cart, then **Proceed to Checkout**.
   - Click **📍 Use my location** (or search an address and drag the pin), and apply coupon **`WELCOME50`**.
   - Choose **Cash on Delivery** and click **Place order**. The tracking page opens.
2. **Admin** (window 2): log in at the admin panel.
   - Open **📦 Orders** and click **→ Confirm**, then **→ Start preparing**.
   - The customer's screen updates instantly.
3. **Rider** (window 3): log in as the assigned rider (usually `raju@hb.com` or `priya@hb.com` for Dharwad).
   - Send a quick chat reply such as **"On my way!"**. It pops up on the customer's screen.
   - Click **📦 Picked up from restaurant**, then **🧪 Simulate ride (demo)**. The scooter moves across the customer's map.
   - Click **✅ Mark as delivered**.
4. **Customer:** rate the order ⭐ and leave a review. It appears on the restaurant page.
5. **Admin:** open **📊 Dashboard** for charts and **🗺️ Live map** to see riders and orders.

**Also try:**
- Choose **🗓️ Schedule for later** at checkout. The admin sees the slot and can **Release now**.
- Tap 🤍 on restaurants and use the **❤️ Favourites** filter.
- Log in a second customer and open the first customer's order link. You'll see *"Order not found"*.
- **Online payment** (when Razorpay test keys are configured): use Razorpay's [test cards / UPI](https://razorpay.com/docs/payments/payments/test-card-details/). In test mode no real money moves.

---

## ✨ Features

### 🍔 Customer
- **Location-based discovery**: restaurants sorted by real distance using MongoDB `$geoNear`, with the distance shown on each card. The location comes from GPS or the quick **Dharwad / Hubli** switch.
- **Smart search**: matches restaurant names, cuisines **and dishes on the menu**, and tolerates spelling ("biriyani" finds Biryani, "panner" finds Paneer).
- **Filters**: cuisine chips, pure-veg, favourites, sort by nearest / top rated / lowest delivery fee.
- **Menus**: veg/non-veg marks, bestseller and sold-out tags, a veg-only toggle, and the restaurant's coupons and offers.
- **Server-calculated bill**: item total, coupon discount, **distance-based delivery fee**, 5% GST, minimum-order check, and an ETA, all priced live by the server.
- **Address picker** on an OpenStreetMap map: GPS, address search, drag the pin to the exact door, and saved **Home / Work** addresses.
- **🗓️ Scheduled orders**: choose a slot from 8 am to 11 pm, up to 3 days ahead.
- **Payments**: Razorpay (UPI / card / netbanking) or Cash on Delivery. **Automatic refund** if a paid order is cancelled.
- **Live tracking**: a status timeline with times, the rider's position moving on a map, the distance left, and a "🟢 Live" indicator.
- **💬 Chat with your rider** in real time, with quick replies ("Please ring the bell", "Leave it at the gate").
- **Cancel** before the restaurant confirms, **⭐ rate and review** after delivery, **↻ reorder** in one tap.
- **❤️ Favourite restaurants**.
- **🌐 English / ಕನ್ನಡ**, remembered per device.
- **📱 Phone OTP login** as an alternative to email and password.

### 🛵 Rider
- Online/offline switch. Going online shares GPS so dispatch can find you.
- **Automatic assignment** of the nearest waiting order. A new order pops up with a notification.
- Pickup and drop details on a map, with **OpenStreetMap directions** links and a call button for the customer.
- Live GPS streaming to the customer (every ~2 seconds).
- **Chat** with the customer, with quick replies ("On my way!", "I'm at your door").
- Cash-to-collect amount shown for COD orders.
- **🧪 Simulate ride** button for demos without travelling.

### ⚙️ Admin
- **📊 Dashboard**: revenue, orders per day, revenue per day, orders by status, top dishes and top restaurants. Choose 7, 14 or 30 days, with a table view for every chart.
- **📦 Orders**:
  - live 🔔 alerts for new orders
  - filter by status, with pagination
  - only valid next-step buttons appear
  - assign or reassign riders
  - cancel with a reason
  - release scheduled orders early
- **🗺️ Live map**: every online rider (green = free, orange = on delivery) and every active order on one map, updated in real time.
- **🏪 Restaurants and 🍽️ Menus**: add, edit, open/close, sold-out toggle, **image upload to Cloudinary**.
- **🛵 Riders**: add riders, which also creates their login. Toggle online/offline, see their last GPS time.
- **🎟️ Coupons**: percent or flat, max discount, minimum order, first-order-only, per-restaurant, expiry.

### 🍽️ Sample data
**21 restaurants and 137 dishes** across Dharwad and Hubli. They range from **Dharwad pedha** and **North Karnataka jolada rotti meals** to **Hubli girmit**, **Malnad kori gassi**, **Mangalorean seafood**, biryani, Chinese, pizza and cafés. There are also 4 coupons: `WELCOME50`, `HUNGRY20`, `FLAT75` and `PEDHA30`.

---

## 🛠️ Tech stack

Everything is open source. The paid services (MongoDB Atlas, Razorpay, Cloudinary, Render, Vercel) are all used on free tiers.

| Layer | Tools |
|---|---|
| **Customer + Rider app** | React 19, Vite, React Router 7, Leaflet + react-leaflet (OpenStreetMap), Socket.io client, react-hot-toast |
| **Admin panel** | React 19, Vite, Recharts, Leaflet |
| **Backend** | Node.js 22, Express 5, Mongoose 8, Socket.io, Zod, Helmet, express-rate-limit, Multer, Swagger UI |
| **Database** | MongoDB Atlas (2dsphere geo indexes, aggregation pipelines, TTL indexes) |
| **Services** | Razorpay (payments + refunds + webhooks), Cloudinary (images), OpenStreetMap tiles + Nominatim geocoding, Twilio Verify (optional SMS OTP) |
| **Quality** | Jest + Supertest on a real MongoDB, Vitest + Testing Library, ESLint, Prettier, GitHub Actions CI, Dependabot |
| **Hosting** | Vercel (both frontends), Render (API, `render.yaml` blueprint), Docker Compose (local) |

---

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Browser
    C[Customer + Rider app<br/>React · Leaflet]
    A[Admin panel<br/>React · Recharts · Leaflet]
  end
  C -- REST + JWT --> API
  A -- REST + JWT --> API
  C <-- Socket.io + JWT --> API
  A <-- Socket.io + JWT --> API
  API[Express 5 API<br/>Zod · Helmet · rate limits<br/>dispatch · pricing · scheduler] --> DB[(MongoDB Atlas)]
  API --> RZ[Razorpay<br/>orders · refunds]
  RZ -- signed webhook --> API
  API --> CL[Cloudinary<br/>images]
  API -. optional .-> TW[Twilio Verify<br/>SMS OTP]
  C --> OSM[OpenStreetMap<br/>tiles + geocoding]
  A --> OSM
```

### Order lifecycle

The server enforces this order of statuses:

```
                         ┌────────────► scheduled ──┐ (released 45 min before the slot)
awaiting_payment ────────┤                          ▼
 (online payment)        └──────────────────────► placed ──► confirmed ──► preparing ──► picked_up ──► delivered
                                                     │            │             │
          cancelled ◄────────────────────────────────┴────────────┴─────────────┘   (auto-refund if paid online)
```

| Who | What they can do |
|---|---|
| **Customer** | Cancel while `scheduled` or `placed` (or before paying) |
| **Admin** | Release scheduled orders early, confirm, start preparing, cancel before pickup, assign riders |
| **Assigned rider** | Mark `picked_up` and `delivered`, only on their own order |
| **System** | `placed` after payment is verified; `scheduled → placed` on time; expire unpaid checkouts after 30 min |

---

## ⚙️ How key parts work

**💰 Pricing.** The browser sends only *menu item IDs and quantities*. The server looks up real prices, then calculates:
- **delivery fee**: the restaurant's base fee covers the first 3 km, then ₹6 per extra km (maximum distance 15 km)
- **coupon discount**: checks minimum order, first-order-only, expiry, restaurant and cap
- **GST**: 5% of the discounted amount
- **ETA**: preparation time + about 3 min per km

**🛵 Dispatch.** When an order is placed, the server finds the closest online, free riders within 20 km of the restaurant (MongoDB `$near`). It then *claims* one with a single atomic update, so two orders can never get the same rider. If nobody is free, the order waits. The next rider who comes online or finishes a delivery automatically gets the oldest waiting order nearby.

**📡 Real time.** Socket.io connections must present a JWT. Each order has its own room, and only the customer, the assigned rider and admins can join it. Events:
- `order_status_update`, `agent_assigned`, `location_update`, `chat_message` (order room)
- `new_order`, `order_updated`, `agent_location` (admins)
- `order_assigned` (riders)

**💳 Payments.** The server creates a Razorpay order for the amount it calculated itself. An order is marked **paid** only after the HMAC signature is verified. That happens either through `/payment/verify` (which also checks the payment belongs to *your* order) or through Razorpay's **signed webhook**, so payment status stays correct even if the customer closes the tab. Both paths can safely run twice. A payment that arrives after a checkout expired is refunded automatically.

**🗓️ Scheduling.** A job runs every minute and releases scheduled orders 45 minutes before their slot. That's when the kitchen starts and a rider is assigned.

**📱 Phone OTP.**
- Codes are 6 digits and stored **hashed**.
- They expire after 5 minutes (MongoDB TTL index), allow 5 wrong attempts, and can be resent after 30 seconds. Sending is rate-limited.
- Admin accounts can't log in with OTP; they must use their password.
- `OTP_PROVIDER=demo` shows the code on screen; `OTP_PROVIDER=twilio` sends a real SMS.

**🌐 Languages.** A small built-in i18n layer with English and Kannada dictionaries (no extra library). Missing Kannada strings fall back to English. A test checks that both languages use the same `{placeholders}`.

---

## 🔐 Security

- **No secrets in the repo.** Everything comes from environment variables, which are validated when the server starts (weak or missing secrets stop it).
- **Input validation with Zod on every route.** Unknown fields are dropped, which blocks mass assignment (e.g. sending `role: "admin"`).
- **Authorization on every resource:**
  - Orders are visible only to their owner, admins and the assigned rider; anyone else gets `404`.
  - Socket rooms use the same check.
- **Race-safe updates:** rider claims and status changes only succeed if the record is still in the expected state.
- **Passwords** hashed with bcrypt and never returned by the API. **OTP codes** stored as HMAC hashes.
- **Helmet** security headers, a **CORS allow-list**, **rate limiting** (stricter on login and OTP), and a central error handler that never leaks stack traces in production.
- **Dependabot** and `npm audit` in CI.

---

## 📁 Project structure

```
hungrybirds/
├── backend/                  Express API
│   ├── app.js                Express app (middleware, routes)
│   ├── server.js             HTTP + Socket.io server, background jobs
│   ├── socket.js             Authenticated real-time events
│   ├── config.js             Validated environment config
│   ├── models/               User, Restaurant, MenuItem, Order, DeliveryAgent, Coupon, Message, Otp
│   ├── routes/               auth, restaurants, menu, orders, payment, agents, coupons, uploads, admin
│   ├── services/             pricing, dispatch, orderLifecycle, payments, schedule, otp, geo, realtime
│   ├── middleware/           auth, validation, errors
│   ├── data/                 extra restaurants + menus
│   ├── scripts/              add-restaurants.js, upgrade-safe.js
│   ├── docs/openapi.yaml     API documentation (served at /api/docs)
│   ├── tests/                Jest + Supertest tests
│   └── seed.js               Demo data (wipes the database)
├── frontend/                 Customer + Rider app (React + Vite)
│   └── src/
│       ├── pages/            Home, Restaurant, Cart, Checkout, OrderTracking, Orders, Login, Register, Rider
│       ├── components/       Navbar, Maps, AddressPicker, ChatBox, ui
│       ├── context/          Auth and Cart state
│       ├── i18n/             en.js, kn.js
│       └── lib/              geo, socket, razorpay, formatting helpers
├── admin-panel/              Admin dashboard (React + Vite)
│   └── src/pages/            Dashboard, Orders, LiveMap, Restaurants, Menu, Riders, Coupons
├── .github/                  CI workflow + Dependabot
├── docker-compose.yml        Local MongoDB + API
└── render.yaml               Render deployment blueprint
```

---

## 🚀 Run it locally

**You need:** Node.js 20 or newer, Git, and either **Docker** or a **MongoDB Atlas** connection string (the free tier works).

```bash
git clone https://github.com/SHARMI-P/hungrybirds.git
cd hungrybirds
```

### 1. Backend API

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set at least:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/hungrybirds?retryWrites=true&w=majority
JWT_SECRET=paste-a-long-random-string-here
SEED_ADMIN_PASSWORD=choose-your-admin-password
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:

```bash
npm install
npm run seed     # ⚠️ wipes the database, then loads 21 restaurants, riders, coupons and the demo users
npm run dev      # API on http://localhost:5000, docs on http://localhost:5000/api/docs
```

**Or use Docker**, which includes MongoDB:

```bash
docker compose up --build
docker compose exec api node seed.js
```

### 2. Customer + Rider app

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev             # http://localhost:3000
```

### 3. Admin panel

```bash
cd admin-panel
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev             # http://localhost:3001
```

Log in with the [demo accounts](#-demo-accounts). Locally, the admin password is whatever you set as `SEED_ADMIN_PASSWORD`.

---

## 🔧 Environment variables

### Backend (`backend/.env`)

| Variable | Required | Example / default | What it does |
|---|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb+srv://…/hungrybirds?…` | Database connection |
| `JWT_SECRET` | ✅ | 64 random hex characters | Signs login tokens (minimum 16 characters) |
| `NODE_ENV` | | `development` / `production` | Production hides error details and turns OTP demo off by default |
| `PORT` | | `5000` | API port (Render sets this automatically) |
| `CLIENT_ORIGINS` | ✅ in prod | `https://hungrybirds-gamma.vercel.app,https://hbadmin.vercel.app` | Browser sites allowed to call the API. **No trailing `/`** |
| `JWT_EXPIRES_IN` | | `7d` | How long a login lasts |
| `RAZORPAY_KEY_ID` | for online pay | `rzp_test_…` | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | for online pay | | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | recommended | | Verifies Razorpay webhooks |
| `CLOUDINARY_CLOUD_NAME` | for uploads | | Cloudinary account |
| `CLOUDINARY_API_KEY` | for uploads | | |
| `CLOUDINARY_API_SECRET` | for uploads | | |
| `OTP_PROVIDER` | | `demo` / `twilio` / `off` | Phone OTP login mode |
| `TWILIO_ACCOUNT_SID` | for `twilio` | | Twilio Verify credentials |
| `TWILIO_AUTH_TOKEN` | for `twilio` | | |
| `TWILIO_VERIFY_SERVICE_SID` | for `twilio` | | |
| `GST_PERCENT` | | `5` | Tax on food |
| `MAX_DELIVERY_KM` | | `15` | Furthest delivery distance |
| `SEED_ADMIN_PASSWORD` | for seeding | | Admin password created by `npm run seed` (random if empty) |
| `SEED_DEMO_PASSWORD` | | `Demo@12345` | Demo customer password |
| `SEED_RIDER_PASSWORD` | | `Rider@12345` | Rider password |

### Frontend and admin (`frontend/.env`, `admin-panel/.env`)

| Variable | Example | What it does |
|---|---|---|
| `VITE_API_URL` | `https://hungrybirds-backend.onrender.com/api` | API address. Must end in `/api`. (`REACT_APP_API_URL` also works.) |

> Online payment, image upload and SMS OTP are **optional**. Without them the app still runs, and those options are simply hidden or disabled.

---

## 🧰 Useful scripts

Run these inside `backend/`:

| Command | What it does | Deletes data? |
|---|---|---|
| `npm run dev` | Start the API with auto-reload | No |
| `npm run seed` | Load all demo data from scratch | ⚠️ **Yes, wipes everything** (refuses in production unless `SEED_ALLOW_PRODUCTION=true`) |
| `node scripts/add-restaurants.js` | Add the extra 10 restaurants and 70 dishes to an existing database | No. Skips restaurants that already exist |
| `NEW_ADMIN_PASSWORD=… node scripts/upgrade-safe.js` | Change the admin password, give old riders logins and map locations, add missing coupons | No |
| `npm test` | Run the API test suite | Uses its own test databases |
| `npm run lint` | Check code style | No |

On Windows PowerShell, set a variable like this before the command:

```powershell
$env:NEW_ADMIN_PASSWORD="YourNewPassword"
node scripts/upgrade-safe.js
```

---

## ☁️ Deployment

### API on Render
1. Create a **Web Service** from this repo, or use the included `render.yaml` blueprint.
2. Set **Root Directory** `backend`, **Build** `npm ci --omit=dev`, **Start** `npm start`, and **Health check** `/api/health`.
3. Add the environment variables: at minimum `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGINS`, `NODE_ENV=production` and `NODE_VERSION=22`. Add `OTP_PROVIDER=demo` so visitors can try phone login.

### Frontends on Vercel
Create two projects from this repo:

| Project | Root Directory | Framework | Build | Output |
|---|---|---|---|---|
| Customer app | `frontend` | Vite | `npm run build` | `build` |
| Admin panel | `admin-panel` | Vite | `npm run build` | `build` |

In each, set `VITE_API_URL` (or `REACT_APP_API_URL`) to `https://<your-api>.onrender.com/api`. The included `vercel.json` handles page refreshes on deep links.

### Razorpay webhook
Go to **Dashboard → Account & Settings → Webhooks → Add**:
- **URL:** `https://<your-api>.onrender.com/api/payment/webhook`
- **Events:** `payment.captured`, `payment.failed`, `order.paid`
- **Secret:** the same value as `RAZORPAY_WEBHOOK_SECRET`

### MongoDB Atlas
- Under **Network Access**, allow Render to connect (`0.0.0.0/0` on the free tier).
- Free clusters **pause after long inactivity**. If the site shows no data, open Atlas and click **Resume**.

---

## 📚 API reference

Interactive docs are at **`/api/docs`** (Swagger UI), and the raw spec is at `/api/openapi.json`. Click **Authorize** and paste a token from `/auth/login` to try protected routes.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` · `GET/POST/DELETE /auth/addresses` |
| Phone OTP | `GET /auth/otp/config` · `POST /auth/otp/send` · `POST /auth/otp/verify` · `POST /auth/otp/complete` |
| Favourites | `GET /auth/favorites` · `POST/DELETE /auth/favorites/:restaurantId` |
| Restaurants | `GET /restaurants/nearby?lat&lng&q&cuisine&veg&sort` · `GET /restaurants/cuisines` · `GET /restaurants/:id` · `GET /restaurants/:id/reviews` · admin CRUD |
| Menu | `GET /menu/:restaurantId` · admin CRUD |
| Orders | `POST /orders/quote` · `POST /orders` · `GET /orders/my` · `GET /orders/:id` · `PUT /orders/:id/status` · `POST /orders/:id/cancel` · `POST /orders/:id/review` · admin `GET /orders` and `PUT /orders/:id/assign` |
| Chat | `GET/POST /orders/:id/messages` |
| Payment | `GET /payment/config` · `POST /payment/verify` · `POST /payment/webhook` |
| Riders | `GET /agents/me` · `PUT /agents/me/status` · `PUT /agents/me/location` · admin CRUD |
| Coupons | `GET /coupons` · admin CRUD |
| Admin | `GET /admin/stats` · `GET /admin/live` · `POST /uploads` |

---

## 🧪 Testing

```bash
cd backend && npm test        # 55 API tests against a real MongoDB
cd frontend && npm test       # unit tests (cart, formatting, translations)
npm run lint                  # in any of the three apps
```

The backend tests cover:
- authentication and validation
- server-side pricing, coupons and distance fees
- nearest-rider dispatch
- the order state machine and who may change what
- Razorpay signature checks, webhooks and refunds
- scheduled orders, chat permissions, OTP login, favourites
- live updates over Socket.io
- security headers and CORS

By default tests use `mongodb://127.0.0.1:27017`; set `MONGO_TEST_URI` to use another server. **GitHub Actions** runs lint, tests and builds for all three apps on every push.

---

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot reach the server" | Render is waking up. Wait about 50 s and refresh. If it persists, check `CLIENT_ORIGINS` on Render exactly matches your Vercel URLs (with `https://`, no trailing `/`). |
| No restaurants appear | Atlas cluster paused (click **Resume**), wrong database name in `MONGODB_URI`, or your location is outside Dharwad/Hubli. Use the **Dharwad / Hubli** links in the header. |
| Rider sees "Waiting for the next order" | The order went to a different (nearer) rider. Check the admin **Live map**. |
| Can't mark "Picked up" | The admin must first move the order to **Preparing**. |
| Online payment option is greyed out | Razorpay keys aren't set on the server. Cash on Delivery still works. |
| Image upload says "not configured" | Add the three `CLOUDINARY_*` variables on Render. |
| Phone OTP tab missing | Set `OTP_PROVIDER=demo` (or `twilio`) on Render. |
| Server won't start: "Invalid environment configuration" | The log names the missing or too-short variable. Add it on Render. |
| Map background is grey | Your network is blocking OpenStreetMap tiles. Markers and tracking still work. |

---

## 🗺️ Roadmap

- Restaurant-owner portal (accept/reject orders, manage their own menu)
- Web Push notifications and an installable PWA
- Road-based routes and ETAs with OSRM
- Rider earnings and payout history
- Playwright end-to-end tests in CI

---

## 👩‍💻 Developer

**Sharmi P** · [@SHARMI-P](https://github.com/SHARMI-P)

Licensed under the [MIT License](LICENSE).
