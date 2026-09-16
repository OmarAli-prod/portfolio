import { getProjects } from '@/lib/projects'
import { getRoles } from '@/lib/roles'
import { Desktop } from '@/components/desktop'
import { projectId, roleId } from '@/lib/ids'
import { ProjectBody } from '@/components/project-body'

export default async function Home() {
  const [projects, roles] = await Promise.all([getProjects(), getRoles()])

  // Compile every MDX body here, in the Server Component, then hand the
  // finished elements to the client desktop. MDXRemote cannot cross into
  // client code, but its output can.
  const bodies: Record<string, React.ReactNode> = {}
  for (const role of roles) {
    bodies[roleId(role.slug)] = <ProjectBody key={role.slug} source={role.body} />
  }
  for (const project of projects) {
    bodies[projectId(project.slug)] = <ProjectBody key={project.slug} source={project.body} />
  }

  return (
    <Desktop roles={roles} projects={projects} bodies={bodies} />
  )
}
