import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';

import { LoadingScreen } from '@/components/Screen';
import { EmployerHome } from '@/features/employer/EmployerHome';
import { CandidateHome } from '@/features/jobs/CandidateHome';

/** Home depends on the role: the job stack for a candidate, their jobs for an employer. */
export default function Home() {
  const me = useQuery(api.users.me);
  if (!me) return <LoadingScreen />;
  return me.role === 'employer' ? <EmployerHome /> : <CandidateHome radiusM={me.radiusM} />;
}
