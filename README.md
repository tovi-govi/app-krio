# Krio-H₂O Firebase Inventory + Orders Build

Customer login uses server-side 2Factor SMS OTP before the app grants access.

Firebase is used for:

- `products` inventory
- admin product add/edit/delete/stock updates
- customer product list sync
- `orders` storage
- order history
- payment UTR/payment status records
- `users` and `admins` profile records
- Firebase Storage product image uploads and saved image URLs

It uses the normal Firebase JavaScript SDK for Firestore, Storage, and admin auth. Customer OTP is handled by the backend through 2Factor, so it works from Expo, Android, iOS, and web as long as the deployed API URL is configured.

## Install

```bash
npm install
npx expo start -c
```

This build uses `firebase` JS SDK, `expo-image-picker`, and `expo-location`.

## Firebase setup summary

1. Create a Firebase project.
2. Create a **Web app** inside Firebase project settings.
3. Copy the web Firebase config values.
4. Create a `.env` file from `.env.example`.
5. Enable Firestore Database.
6. Create a 2Factor account and API key for customer OTP.
7. Enable Firebase Storage if you want product image uploads/URLs.
8. Run the app.

## Customer OTP login

Customer login requires:

1. Name.
2. 10-digit mobile number.
3. 2Factor SMS OTP verification.

The app calls your backend:

```text
POST /api/otp/send
POST /api/otp/verify
```

The 2Factor API key must be kept only on the server, for example in Vercel environment variables. Do not add it to Expo public env variables.

## Required `.env`

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_API_BASE=https://your-vercel-project.vercel.app
```

## Server environment variables

Add these in Vercel project settings, not in the Expo app:

```env
TWO_FACTOR_API_KEY=your_2factor_api_key

# Optional: only if you configure a named OTP template in 2Factor.
TWO_FACTOR_TEMPLATE_NAME=KRIOH2O

```

## Admin login

Admin login now uses Firebase Authentication email/password instead of the old local password.

1. In Firebase Console, enable **Authentication -> Sign-in method -> Email/Password**.
2. Create the admin user in **Authentication -> Users**.
3. Copy that user's UID.
4. In Firestore, create either:

```text
admins/{firebaseAuthUid}
  name: Krio Admin
  role: admin
  isActive: true
```

or:

```text
admins/{adminEmail}
  name: Krio Admin
  role: admin
  isActive: true
```

Then sign in from the app's Admin tab with that email and password.

## Firestore collections used

```text
products/
  productId/
    size
    use
    emoji
    price
    stock
    isActive
    imageUrl
    createdAt
    updatedAt

orders/
  orderId/
    items
    total
    customer
    status
    paymentStatus
    paymentMethod
    utr
    createdAt
    updatedAt

users/
  phoneNumber/
    name
    phone
    email
    role
    createdAt
    updatedAt

admins/
  local-admin/
    name
    phone
    role
    createdAt
    updatedAt
```

## Notes

- If `EXPO_PUBLIC_API_BASE` is missing, customer OTP login cannot reach your backend.
- If `TWO_FACTOR_API_KEY` is missing on the backend, customer OTP login cannot send SMS.
- The first Firebase connection seeds default products if the `products` collection is empty.
- Orders are written with a Firestore transaction, so stock is reduced safely when an order is placed.
- Razorpay is disabled for now. Orders are placed as Pay on Delivery and admin can mark payment as verified/rejected.
- Product image upload uses Firebase Storage from the admin panel. After uploading, tap **Save Product**.

## Amazon-style order notification flow

This build keeps everything in Expo Go and Firestore only.

When a customer confirms an order:

1. The order is written to the `orders` collection.
2. Product stock is reduced in the same Firestore transaction.
3. A new admin alert is written to the `adminNotifications` collection.
4. The admin panel listens live to `adminNotifications`, so new orders appear immediately.
5. Admin can mark the notification as read, verify payment, send the order, mark delivered, or cancel.

Firestore collections used by this flow:

- `products`
- `orders`
- `users`
- `admins`
- `adminNotifications`

Status flow:

`Confirmed` → `Order Sent` → `Delivered`

Payment flow:

`Pending Verification` → `Verified`

This is an in-app admin notification system. Real push notifications when the admin app is closed would need Expo Notifications plus a small backend/cloud function later.

## Payment flow

Razorpay is currently excluded. Customer checkout places a Pay on Delivery order after address validation. Admin can collect payment offline and then mark the order as verified, sent, delivered, or cancelled.

For production, keep Firestore write rules locked down and consider moving final order creation into the backend or a Cloud Function so users cannot bypass the client.


2 factor password :  998100
