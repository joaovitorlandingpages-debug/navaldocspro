import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vessels')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/vessels"!</div>
}
