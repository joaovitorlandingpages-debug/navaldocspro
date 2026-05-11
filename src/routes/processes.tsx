import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/processes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/processes"!</div>
}
