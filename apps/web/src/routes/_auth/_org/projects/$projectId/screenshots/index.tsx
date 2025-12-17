import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_auth/_org/projects/$projectId/screenshots/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/_org/projects/$projectId/screenshots/"!</div>
}
