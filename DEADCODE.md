# Dead Code Audit Report

## Summary

A comprehensive multi-angle audit was conducted across the entire codebase (`app/`, `components/`, `context/`, `services/`, `utils/`, `constants/`, and `api/`) tracing all entry points, imports, component references, and runtime dependencies.

- **Files Identified for Deletion:** 1 file (160 lines)
- **Functions/Methods Identified for Deletion:** 5 functions/methods (~75 lines)
- **Classes/Type Interfaces Identified for Deletion:** 1 type interface (15 lines)
- **Variables/Constants Identified for Deletion:** 3 context state variables (~25 lines)

Total estimated lines of code that can be safely deleted: **~275 lines**.

---

## Files to Delete

### 1. `components/UI/LazyList.tsx`
- **Location:** [components/UI/LazyList.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/components/UI/LazyList.tsx)
- **Reason:** Component created for paginated lazy list rendering with search/filter capabilities. It is not imported or referenced anywhere in `app/`, `components/`, `context/`, or `utils/`.

---

## Functions/Methods to Delete

### 1. `addToCart()`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Method defined and exposed on `CartContextValue` for adding products to a shopping cart. Never invoked in any admin or delivery screen.

### 2. `increaseQuantity()`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Method defined on `CartContextValue` to increment cart item quantity. Never called anywhere in the codebase.

### 3. `decreaseQuantity()`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Method defined on `CartContextValue` to decrement cart item quantity. Never called anywhere in the codebase.

### 4. `removeFromCart()`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Method defined on `CartContextValue` to remove items from cart. Unused across all active screens.

### 5. `deleteProduct()`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Method defined on `CartContextValue` for hard deleting products. Inventory management in `app/admin/inventory.tsx` toggles active visibility via `saveProduct` instead; `deleteProduct` is never invoked.

---

## Classes to Delete

### 1. `LazyListProps<T>`
- **Location:** [components/UI/LazyList.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/components/UI/LazyList.tsx)
- **Reason:** Generic TypeScript prop interface for the unused `LazyList` component.

---

## Variables/Constants to Delete

### 1. `cart`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Unused cart array state maintained inside `CartContext`. No client UI renders or consumes the shopping cart array.

### 2. `totalItems`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Computed cart item quantity total state variable in `CartContext`. Unused across all application screens.

### 3. `total`
- **Location:** [context/CartContext.tsx](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/context/CartContext.tsx)
- **Reason:** Computed cart currency total amount state variable in `CartContext`. Unused across all application screens.

---

## Verification Notes

1. **Static Analysis & Text Tracing:** Verified via comprehensive string and pattern searches across all files (`.tsx`, `.ts`, `.js`, `.json`).
2. **Platform & Layout Component Verification:** Confirmed `Dock.tsx`, `Dock.web.tsx`, and `Dock.css` are actively consumed in `app/admin/_layout.tsx` for cross-platform navigation.
3. **API & Backend Verification:** Retained `api/health.js` as an active Vercel serverless healthcheck endpoint.
4. **Theme Design Tokens:** Verified `Colors`, `Radius`, `Shadow` (including `Shadow.glow`), and spacing tokens are actively consumed across modal, toast, and delivery card components.

---

## Estimated Impact

- **Files to remove:** 1 file (`components/UI/LazyList.tsx`)
- **Lines of code to remove:** ~275 lines
- **Bundle & Performance Impact:** Streamlined `CartContext` evaluation and state recalculations with reduced JS bundle overhead.
