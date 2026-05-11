import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/documents')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/documents"!</div>
}
