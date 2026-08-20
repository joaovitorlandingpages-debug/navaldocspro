# Plan: Cofre de Documentos (Document Vault)

Create a central document management hub for NavalDocs Pro with advanced filtering, grid/list views, and deep integration with processes and clients.

## User Review Required

> [!IMPORTANT]
> - Which route is preferred: `/admin/documents` or `/workspace/documents`? (I will default to `/admin/documents` to match existing admin patterns).
> - Should this be accessible only by `admin` roles, or should regular users see their own company's documents here as well? (I will implement RLS so users only see their tenant's data).

## Proposed Changes

### Database & Backend
- Ensure `generated_documents` and related tables have correct RLS policies for global querying.
- No new tables are required, as we will query existing `generated_documents` and `document_uploads`.

### Frontend Components

#### 1. New Route: `/admin/documents`
- Create `src/routes/admin/documents.tsx`.
- Implement a high-performance fetching hook using TanStack Query that joins documents with their parent `processes` and `profiles` (clients).

#### 2. Component: `DocumentVault`
- **View Toggle**: Switch between `GridView` and `ListView`.
- **Search & Filters**:
    - Global text search (filename, client name).
    - Status filters (Upload, OCR, Signed).
    - Client and Vessel dropdown filters.
- **Action Menu**:
    - Preview (PDF viewer).
    - Download.
    - Request Signature (integration with `signatureService`).
    - "Go to Process" link.

### UI Refinement
- Maintain the "Premium White/Green" aesthetic.
- Add hover states for immediate actions.

## Technical Details
- **Fetch Logic**: `supabase.from('generated_documents').select('*, processes(id, title, vessels(name)), profiles(full_name)')`.
- **State Management**: Local state for view modes and filter criteria.
- **Components**: Use Shadcn UI (Table, Card, Input, Badge, Button, DropdownMenu).
