# Krio-H₂O Expo Firebase Management System

A React Native Expo Router application for water delivery operations, custom organization product pricing, bottling plant tracking, and admin inventory/invoice reporting.

---

## 🌟 Key Features

- **Custom Organization Product Pricing**: Store and manage per-product unit prices (`20L Can`, `1L Bottle`, `500ml Bottle`, `200ml Pack`) independently for every partner organization. Monthly invoices, delivery run history, and Excel exports calculate totals using organization-specific pricing rates.
- **Firebase Authentication & Access Control**: Secure Email & Password login for Staff, Delivery Personnel, and Admins with automatic role-based navigation guards.
- **Partner Organization & Plant Tracking**: Comprehensive management of corporate partner locations and bottling plant facilities.
- **Delivery Log Management**: Track 20L water cans loaded/returned as well as packaged bottle cases (200ml, 500ml, 1L) with real-time stock updating.
- **Monthly Excel Invoice Generator**: Native Excel (`.xlsx`) invoice & delivery report creation powered by `ExcelJS` with email export capabilities.
- **Interactive Spreadsheet Dashboard**: Live Admin Excel preview grid complete with quantity badges, accounting totals, and horizontal scroll support.
- **Production-Grade Security & Robustness**: Cloud Firestore security rules (`firestore.rules`), double-submit protection, numeric sanitization, and clean error mappers.
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

## 📱 Building the Android APK & Publishing OTA Updates

### Building Standalone APK (EAS Cloud Build)

To generate a standalone installable `.apk` file for Android:

```bash
npx eas-cli build --platform android --profile preview
```

### Publishing Over-The-Air (OTA) Updates

For JS/UI updates (styles, components, bug fixes) without rebuilding the full APK:

```bash
npx eas-cli update --branch preview --message "Update description"
```

Installed app instances automatically fetch and apply OTA updates on restart.

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

## 🔥 Firebase Configuration & Security Rules

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database**.
3. Enable **Authentication** -> **Email/Password**.
4. Deploy the provided Cloud Firestore security rules (`firestore.rules`):

```bash
firebase deploy --only firestore:rules
```

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
- **`organizations`**: Partner client directories (addresses, points of contact, and custom product `pricing` dictionary).
- **`plants`**: Bottling plant locations and supply hubs.
- **`deliveries`**: Delivery run logs tracking cans loaded, empty cans picked up, and packaged cases delivered.
- **`deliverySchedules`**: Scheduled delivery runs by date and organization.
- **`orders`**: Customer orders and payment verification statuses.
- **`adminNotifications`**: Live operational notifications for system administrators.

---

## 🛠️ Project Architecture

```text
├── app/
│   ├── admin/              # Admin dashboard, inventory, plants, schedule, organizations & notifications
│   ├── organization/       # Organization history view with org-specific pricing summary
│   ├── _layout.tsx         # Root layout with Auth, Cart providers & role guards
│   ├── delivery.tsx        # Delivery personnel workflow screen
│   ├── login.tsx           # Staff & Admin authentication screen
│   └── profile.tsx         # User profile and account management
├── components/
│   └── UI/                 # Reusable UI components (SearchInput, ConfirmModal, Toast)
├── constants/
│   └── theme.ts            # Design system tokens (Colors, Radius, Shadow)
├── context/
│   ├── AuthContext.tsx     # Firebase Authentication provider & error mapping
│   └── CartContext.tsx     # Central app state (Deliveries, Schedules, Products, Plants, Orgs)
├── utils/
│   ├── excelInvoiceGenerator.ts  # ExcelJS monthly report export engine
│   └── invoiceAggregator.ts     # Monthly delivery aggregation logic with org rates
├── firestore.rules          # Cloud Firestore role-based security rules
├── eas.json                 # EAS build configuration (APK build settings)
└── api/
    └── health.js           # API health check endpoint
```

---

## 📝 Recent System Optimizations & Production Hardening

- **Organization Custom Product Pricing**: Complete end-to-end integration supporting individual per-product unit prices for all corporate partners.
- **Role-Based Navigation Guards**: Enforced automatic route protection across `/admin`, `/delivery`, and `/organization/[id]`.
- **Double-Submit Safeguards**: Async submit buttons disabled during network operations across all forms.
- **Numerical Sanitization**: Non-negative sanitization (`Math.max(0, Number(val) || 0)`) across all delivery calculation routines preventing `NaN` invoice outputs.
- **Clean Code Audit**: Removal of legacy dead components (`LazyList.tsx`), unused cart functions, and redundant context state.