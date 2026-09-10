/**
 * Window ids are namespaced so a role and a project can share a slug without
 * colliding in the window reducer.
 *
 * Lives outside the client components so Server Components can build the same
 * keys when compiling MDX bodies.
 */
export const roleId = (slug: string) => `role/${slug}`
export const projectId = (slug: string) => `project/${slug}`
