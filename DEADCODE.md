# Dead Code Audit Report

## Summary

- **Total Files Identified for Deletion:** 6 asset files (unused client/partner brand logos in `assets/logos/`)
- **Total Functions/Methods Identified for Deletion:** 1 function (`exportExpensesToCSV` in `utils/expenseExporter.ts`)
- **Total Unused Imports & Variables Identified for Cleanup:** 8 unused icon imports & symbols in `app/admin/expenses.tsx`
- **Total Classes Identified for Deletion:** 0 (Codebase follows functional React / TypeScript architecture)

---

## Files to Delete

The following files are not imported, referenced, or loaded anywhere in the application source code or build configuration:

1. **[assets/logos/associate.webp](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/assets/logos/associate.webp)**
   - **Reason:** Legacy image asset. Never referenced in any TSX/JSX component, stylesheet, or dynamic image require call.
2. **[assets/logos/bajaj.svg](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/assets/logos/bajaj.svg)**
   - **Reason:** Unused partner SVG logo asset. Not imported or rendered in any view.
3. **[assets/logos/digit.svg](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/assets/logos/digit.svg)**
   - **Reason:** Unused SVG logo asset. No references exist across the workspace.
4. **[assets/logos/equitas.jpg](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/assets/logos/equitas.jpg)**
   - **Reason:** Unused partner JPEG image asset. No references exist across the workspace.
5. **[assets/logos/hdfc.svg](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/assets/logos/hdfc.svg)**
   - **Reason:** Unused partner SVG logo asset. Never imported or rendered.
6. **[assets/logos/lic.svg](file:///c:/Users/Govindh%20Reddy/Documents/PaidStuff/app-krio-main/app-krio-main/assets/logos/lic.svg)**
   - **Reason:** Unused SVG logo asset. No references exist in source code.

---

## Functions/Methods to Delete

### `utils/expenseExporter.ts`
- **`exportExpensesToCSV`** (lines 189–218):
  - **Reason:** CSV export functionality was intentionally removed from the user interface in favor of Excel (`.xlsx`) and PDF exports. The function remains in `expenseExporter.ts` and its import in `app/admin/expenses.tsx` is completely unused.

---

## Classes to Delete

- **None**: The application is built using modern functional React TypeScript components and custom hooks. No object-oriented class hierarchies or unused ES6 classes exist in the source codebase.

---

## Variables/Constants to Delete

### `app/admin/expenses.tsx`
- **Unused Icon Imports from `lucide-react-native`:**
  - `Filter` (line 26)
  - `RotateCcw` (line 29)
  - `Search` (line 30)
  - `TrendingDown` (line 32)
  - `DollarSign` (line 36)
  - `Camera` (line 39)
  - `ImageIcon` (line 42)
  - `exportExpensesToCSV` (imported from `@/utils/expenseExporter`)

---

## Verification Notes

1. **Platform Resolution (.web.tsx):**
   - Verified that `app/components/Dock.web.tsx` is active for web builds via Expo/Metro platform-specific extension resolution when `Dock.tsx` is imported.
2. **Serverless Endpoint:**
   - Verified `api/health.js` as an active Vercel serverless healthcheck endpoint.
3. **Core Utility & Component Verification:**
   - Confirmed `routeOptimizer.ts`, `invoiceAggregator.ts`, `excelInvoiceGenerator.ts`, `LocationPickerModal.tsx`, `ConfirmModal.tsx`, `Toast.tsx`, and `Skeleton.tsx` are actively imported and used.

---

## Estimated Impact

- **Disk Space Savings:** ~800 KB (removal of unused logo images and vector graphics).
- **Code Reduction:** ~35 lines of TypeScript code and unused import declarations.
