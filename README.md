# 🐦 HungryBirds - Food Delivery App

A full-stack food delivery web application inspired by Swiggy, built for Dharwad and Hubli regions. Users can browse restaurants, order food, make payments, and track deliveries in real time.

---

## 🌐 Live Demo

| Platform | Link |
|---|---|
| 🍔 Customer App | [hungrybirds-gamma.vercel.app](https://hungrybirds-gamma.vercel.app) |
| ⚙️ Admin Panel | [hbadmin.vercel.app](https://hbadmin.vercel.app) |
| 🖥️ Backend API | [hungrybirds-backend.onrender.com](https://hungrybirds-backend.onrender.com) |

---

## ✨ Features

### Customer App
- 📍 Location-based restaurant discovery
- 🍽️ Browse menus with photos and prices
- 🛒 Add to cart and place orders
- 💳 Razorpay payment integration
- 📦 Real-time order tracking
- 🔐 User authentication (Register / Login)

### Admin Panel
- 🏪 Add and manage restaurants
- 🍜 Add and manage menu items
- 📋 View and manage all orders
- 🚴 Manage delivery agents
- 📊 Dashboard overview

---

## 🛠️ Tech Stack

### Frontend
- React.js
- React Router
- Axios
- Context API (Auth + Cart)
- CSS3

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- Socket.io (Real-time tracking)
- Razorpay API
- Cloudinary (Image uploads)

### Deployment
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas
- Images → Cloudinary

---

## 📁 Project Structure

```
HungryBirds/
├── frontend/          # React customer app (Port 3000)
├── backend/           # Node.js + Express API (Port 5000)
└── admin-panel/       # React admin dashboard (Port 3001)
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Node.js installed
- MongoDB Atlas account
- Razorpay account (test keys)

### Step 1 — Clone the Repository
```bash
git clone https://github.com/SHARMI-P/hungrybirds.git
cd hungrybirds
```

### Step 2 — Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Seed the database:
```bash
node seed.js
```

Start the backend:
```bash
npm run dev
```

### Step 3 — Setup Frontend
```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Start the frontend:
```bash
npm start
```

### Step 4 — Setup Admin Panel
```bash
cd ../admin-panel
npm install
npm start
```

---

## 🔑 Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@hungrybirds.com | admin123 |
| Customer | test@test.com | test123 |

---

## 📱 Screenshots

### Customer App
- Home page with restaurant listings
- Restaurant menu page
- Cart and checkout
- Order tracking

### Admin Panel
- Dashboard
- Restaurant management
- Menu management
- Order management

---

## 🗺️ Restaurants Available

### Dharwad
- Hotel Shree Renuka
- New Taj Hotel
- Dharwad Pedha Sweet House
- Hotel Adarsha
- Udupi Krishna Bhavan
- Sweet Cravings Dessert Cafe

### Hubli
- Hotel Ajanta
- Tandoor Restaurant
- Shahi Biryani Center
- Comfort Zone Cafe
- Hotel Dasaprakash

---

## 🔧 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### Restaurants
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurants/nearby` | Get nearby restaurants |
| GET | `/api/restaurants/:id` | Get restaurant by ID |
| POST | `/api/restaurants` | Add restaurant (Admin) |

### Menu
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/menu/:restaurantId` | Get menu by restaurant |
| POST | `/api/menu` | Add menu item (Admin) |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Place order |
| GET | `/api/orders/my` | Get my orders |
| PUT | `/api/orders/:id` | Update order status (Admin) |

### Payment
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payment/create-order` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify payment |

---

## 👩‍💻 Developer

**Sharmi P**
- GitHub: [@SHARMI-P](https://github.com/SHARMI-P)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

⭐ If you like this project, give it a star on GitHub!
