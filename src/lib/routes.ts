import type { Href } from 'expo-router';

/**
 * The address of one job's detail screen.
 *
 * Written as a plain path and cast: the generated route types list this screen
 * as the literal "/job/[jobId]/index" rather than as a route with a parameter,
 * so the typed form does not accept it. The path itself is what the router resolves.
 */
export function jobHref(jobId: string): Href {
  return `/job/${jobId}` as Href;
}
