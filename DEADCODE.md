# Dead Code Audit Report

## Summary

This audit evaluated the entire codebase (`app/`, `components/`, `context/`, `services/`, `utils/`, `constants/`, and `api/`) to identify dead, unreachable, and unused code elements that can be safely removed without impacting application behavior or functionality.

- **Files Identified for Deletion:** 2 files (125 lines)
- **Functions/Methods Identified for Deletion:** 4 functions/methods (52 lines)
- **Classes/Type Interfaces Identified for Deletion:** 2 type definitions (17 lines)
- **Variables/Constants/Exports Identified for Deletion:** 9 variables/constants (48 lines)
- **Unused Imports & Dead Style Rules Identified for Deletion:** 3 items (8 lines)

Total estimated lines of code that can be safely deleted: **~250 lines**.

---

## Files to Delete

### 1. `api/otp/send.js`
- **Location:** [api/otp/send.js](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/api/otp/send.js)
- **Reason:** Legacy 2Factor SMS OTP endpoint handler. The application handles authentication exclusively via Firebase Email/Password authentication (`signInWithEmailAndPassword`) in [context/AuthContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/AuthContext.tsx). This API route is not referenced anywhere in frontend components or contexts.

### 2. `api/otp/verify.js`
- **Location:** [api/otp/verify.js](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/api/otp/verify.js)
- **Reason:** Legacy 2Factor SMS OTP verification endpoint handler. Unused by all client screens and context providers.

---

## Functions/Methods to Delete

### 1. `goBack()`
- **Location:** [app/login.tsx:L27-L33](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/app/login.tsx#L27-L33)
- **Reason:** Function is declared to handle back navigation but is never invoked or attached to any UI element in `LoginScreen`.

### 2. `updateOrderStatus()`
- **Location:** [context/CartContext.tsx:L778-L797](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx#L778-L797)
- **Reason:** Method defined and exposed on `CartContextValue`, but never consumed or called in any admin or customer screen.

### 3. `saveProduct()`
- **Location:** [context/CartContext.tsx:L607-L628](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx#L607-L628)
- **Reason:** Method defined on `CartContextValue` to add/edit products, but product editing is handled through fixed stock deductions or defaults; `saveProduct` is never called.

### 4. `clearCart()`
- **Location:** [context/CartContext.tsx:L513](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx#L513)
- **Reason:** Exposed via `useCart()`, but never called externally. Cart clearing is performed internally inside `addOrder` via `setCart([])`.

---

## Classes to Delete

### 1. Duplicate `DockProps` and `DockItemData`
- **Location:** [app/components/Dock.web.tsx:L28-L44](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/app/components/Dock.web.tsx#L28-L44)
- **Reason:** Redundant interface type definitions in `Dock.web.tsx` that duplicate types from `Dock.tsx` and are unused internally.

---

## Variables/Constants to Delete

### 1. `Fonts`
- **Location:** [constants/theme.ts:L20-L23](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/constants/theme.ts#L20-L23)
- **Reason:** Constant object exported from theme system but never imported or referenced in any style sheet.

### 2. `Spacing`
- **Location:** [constants/theme.ts:L34-L40](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/constants/theme.ts#L34-L40)
- **Reason:** Constant object exported from theme system but never imported or referenced.

### 3. `TouchTarget`
- **Location:** [constants/theme.ts:L42-L45](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/constants/theme.ts#L42-L45)
- **Reason:** Constant object exported from theme system but never imported or referenced.

### 4. `Layout`
- **Location:** [constants/theme.ts:L47-L51](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/constants/theme.ts#L47-L51)
- **Reason:** Constant object exported from theme system but never imported or referenced in layouts.

### 5. `Radius.xs`
- **Location:** [constants/theme.ts:L26](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/constants/theme.ts#L26)
- **Reason:** Unused border radius value token (`xs: 6`).

### 6. `Shadow.glow`
- **Location:** [constants/theme.ts:L68-L74](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/constants/theme.ts#L68-L74)
- **Reason:** Defined in `theme.ts` and `Toast.tsx`, but unused across all major component cards.

### 7. `unreadAdminNotifications`
- **Location:** [context/CartContext.tsx:L475](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx#L475)
- **Reason:** Computed count in context state that is not consumed in any badge or navigation element.

### 8. Legacy `message2` Fallback
- **Location:** [app/admin/notifications.tsx:L28](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/app/admin/notifications.tsx#L28)
- **Reason:** `(notification as any).message2` is a legacy fallback check; `notification.message` is the standard property on `AdminNotification`.

### 9. `styles.linkText`
- **Location:** [app/login.tsx:L143](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/app/login.tsx#L143)
- **Reason:** Unused style definition in `StyleSheet.create`.

### 10. Unused Imports
- **`ArrowLeft` import:** [app/login.tsx:L16](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/app/login.tsx#L16)
- **`ActivityIndicator` import:** [app/organization/[id].tsx:L2](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/app/organization/%5Bid%5D.tsx#L2)

---

## Verification Notes

1. **Static Reference Auditing:** Verified via exact text search across all workspace files (`.tsx`, `.ts`, `.js`, `.json`).
2. **Serverless & API Routes:** Preserved active API routes (`api/health.js`, `api/razorpay/create-payment-link.js`, `api/razorpay/check-payment-link.js`) as they serve as valid Vercel backend entry points.
3. **Public Interfaces & SDKs:** Retained `saveOrganization`, `savePlant`, `deleteOrganization`, and `deletePlant` as they are actively bound to directory administration forms.

---

## Estimated Impact

- **Files to remove:** 2 files
- **Lines of code to remove:** ~250 lines
- **Performance / Bundle Impact:** Cleaner context provider state evaluation and reduced JavaScript bundle size.
