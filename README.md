# Krio-H₂O Expo Firebase Management System

A React Native Expo Router application for water delivery operations, partner organization management, bottling plant tracking, and admin inventory/invoice reporting.

---

## 🌟 Key Features

- **Firebase Authentication & Access Control**: Secure Email & Password login for Staff, Delivery Personnel, and Admins.
- **Partner Organization & Plant Tracking**: Comprehensive management of corporate partner locations and bottling plant facilities.
- **Delivery Log Management**: Track 20L water cans loaded/returned as well as packaged bottle cases (200ml, 500ml, 1L).
- **Monthly Excel Invoice Generator**: Native Excel (`.xlsx`) invoice & delivery report creation powered by `ExcelJS` with email export capabilities.
- **Interactive Spreadsheet Dashboard**: Live Admin Excel preview grid complete with quantity badges, accounting totals, and horizontal scroll support.
- **Virtualized High-Performance UI**: Fully virtualized lists (`FlatList` / `LazyList`) preventing lag on high-volume notification and delivery feeds.
- **Multi-Platform Support**: Optimized for Android, iOS, and Expo Web using `expo-router`.

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Start Development Server

```bash
npx expo start -c
```

To launch directly on an Android emulator or device:

```bash
npm run android
```

---

## 🔑 Environment Setup

Copy `.env.example` to `.env` and configure your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 🔥 Firebase Configuration

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database**.
3. Enable **Authentication** -> **Email/Password**.
4. Enable **Firebase Storage** for product/facility image uploads.
5. Create Admin & Staff records in Firestore:

### Example Firestore Admin Document

`admins/{firebaseAuthUid}` or `admins/{adminEmail}`:
```json
{
  "name": "Krio Admin",
  "phone": "+91 9876543210",
  "role": "admin",
  "isActive": true
}
```

---

## 📊 Firestore Data Structure

- **`products`**: Catalog of 20L water cans and packaged bottle cases (200ml, 500ml, 1L).
- **`organizations`**: Partner client directories (addresses, points of contact).
- **`plants`**: Bottling plant locations and supply hubs.
- **`deliveries`**: Delivery run logs tracking cans loaded, empty cans picked up, and packaged cases delivered.
- **`orders`**: Customer orders and payment verification statuses.
- **`adminNotifications`**: Live operational notifications for system administrators.

---

## 🛠️ Project Architecture

```text
├── app/
│   ├── (tabs)/             # Tab navigation (Products, Cart, Admin)
│   ├── admin/              # Admin dashboard, inventory, plants, organizations & notifications
│   ├── organization/       # Organization details view
│   ├── _layout.tsx         # Root layout with Auth & Cart state providers
│   ├── delivery.tsx        # Delivery personnel workflow screen
│   ├── login.tsx           # Staff & Admin authentication screen
│   └── profile.tsx         # User profile and account management
├── components/
│   └── UI/                 # Reusable UI components (LazyList, SearchInput, ConfirmModal, Toast)
├── constants/
│   └── theme.ts            # Design system tokens (Colors, Radius, Shadow)
├── context/
│   ├── AuthContext.tsx     # Firebase Authentication provider
│   └── CartContext.tsx     # Central app state (Orders, Deliveries, Products, Plants, Orgs)
├── utils/
│   ├── excelInvoiceGenerator.ts  # ExcelJS monthly report export engine
│   └── invoiceAggregator.ts     # Monthly delivery aggregation logic
└── api/
    └── health.js           # API health check endpoint
```

---

## 📝 Recent System Optimizations

- **Safe Screen Transitions**: Pre-navigation stack execution eliminating `react-native-screens` unmount crashes on logout.
- **Depth-Guarded Firestore Cleaner**: Recursion safety limits (`depth > 12`) on `cleanFirestoreData` preventing Android Hermes stack overflows.
- **Clean Code Audit**: Elimination of legacy dead endpoints, unused constants, and redundant type definitions.