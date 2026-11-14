import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { CardSkeleton, ListSkeleton } from '@/components/Skeleton';
import { ApplicantsList, type Applicant } from '@/features/employer/ApplicantsList';
import { CandidateSetupForm } from '@/features/forms/CandidateSetupForm';
import { ImageGrid } from '@/features/images/ImageGrid';
import { PhotoEditor } from '@/features/images/PhotoEditor';
import { CompanyForm } from '@/features/forms/CompanyForm';
import { JobForm } from '@/features/forms/JobForm';
import { ApplicationsList, type Application } from '@/features/jobs/ApplicationsList';

export const PREVIEW_VIEWS = ['setup', 'company', 'job', 'applicants', 'applications', 'images', 'photo', 'loading'] as const;
export type PreviewView = (typeof PREVIEW_VIEWS)[number];

// Coloured tiles standing in for photos, so the preview needs no files or network.
const TILE_COLOURS = ['%231557B8', '%23FFD166', '%230E7A4B', '%2351607A', '%23B3261E', '%236EA8FF'];
function sampleTile(index: number) {
  const colour = TILE_COLOURS[index % TILE_COLOURS.length];
  return {
    id: `tile-${index}`,
    url: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='${colour}'/%3E%3C/svg%3E`,
  };
}
const GOOGLE_PHOTO = sampleTile(5).url;

// Stands in for the backend: waits a moment, then succeeds.
const pretendToSave = () => new Promise<void>((resolve) => setTimeout(resolve, 600));

function sampleApplicants(now: number): Applicant[] {
  const minutes = (n: number) => now - n * 60_000;
  return [
    {
      _id: 'a1',
      appliedAt: minutes(8),
      decision: 'pending',
      name: 'Amine Ben Salah',
      photoUrl: null,
      about: 'Trois ans comme réceptionniste à Nabeul. Français, anglais, un peu d’allemand.',
      distanceBucket: 'lt1',
    },
    {
      _id: 'a2',
      appliedAt: minutes(140),
      decision: 'accepted',
      name: 'سلمى التريكي',
      photoUrl: null,
      about: 'خدمت عامين في الاستقبال. فاضية في الليل.',
      distanceBucket: '1to3',
    },
    {
      _id: 'a3',
      appliedAt: minutes(60 * 30),
      decision: 'rejected',
      name: 'Youssef K.',
      photoUrl: null,
      about: null,
      distanceBucket: '5to10',
    },
  ];
}

function sampleApplications(now: number): Application[] {
  const minutes = (n: number) => now - n * 60_000;
  return [
    { _id: 'p1', appliedAt: minutes(20), decision: 'pending', jobTitle: 'Réceptionniste de nuit', jobStatus: 'open', companyName: 'Hôtel Les Orangers' },
    { _id: 'p2', appliedAt: minutes(60 * 5), decision: 'accepted', jobTitle: 'نادل في قهوة', jobStatus: 'open', companyName: 'قهوة سيدي بوحديد' },
    { _id: 'p3', appliedAt: minutes(60 * 50), decision: 'rejected', jobTitle: 'Pool attendant', jobStatus: 'open', companyName: 'Yasmine Beach Resort' },
    { _id: 'p4', appliedAt: minutes(60 * 24 * 12), decision: 'pending', jobTitle: 'Livreur à scooter', jobStatus: 'closed', companyName: 'Rapido Hammamet' },
  ];
}

/** One screen from the app, shown with sample data and a pretend backend. Development only. */
export function PreviewViewScreen({ view }: { view: PreviewView }) {
  const { t } = useTranslation();
  const [now] = useState(() => Date.now());
  const [applicants, setApplicants] = useState(() => sampleApplicants(now));
  const errorMessage = () => t('errors.generic');
  const [images, setImages] = useState(() => [sampleTile(0), sampleTile(1)]);
  const nextTile = useRef(0);
  const [photo, setPhoto] = useState<string | null>(GOOGLE_PHOTO);

  switch (view) {
    case 'setup':
      return <CandidateSetupForm onSubmit={pretendToSave} errorMessage={errorMessage} />;
    case 'company':
      return <CompanyForm onSubmit={pretendToSave} errorMessage={errorMessage} />;
    case 'job':
      return <JobForm onSubmit={pretendToSave} errorMessage={errorMessage} />;
    case 'applicants':
      return (
        <Screen scroll underHeader>
          <AppText variant="display">{t('applicants.title')}</AppText>
          <ApplicantsList
            applicants={applicants}
            now={now}
            busyId={null}
            onDecide={(applicant, accept) =>
              setApplicants((current) =>
                current.map((item) =>
                  item._id === applicant._id ? { ...item, decision: accept ? 'accepted' : 'rejected' } : item,
                ),
              )
            }
          />
        </Screen>
      );
    case 'images':
      return (
        <Screen scroll underHeader>
          <AppText variant="display">{t('images.title')}</AppText>
          <AppText color="inkMuted">{t('images.body')}</AppText>
          <ImageGrid
            images={images}
            max={4}
            adding={false}
            busyId={null}
            // The preview has no photo library; adding cycles through sample tiles.
            onAdd={() => setImages((current) => [...current, sampleTile(current.length + nextTile.current++)])}
            onRemove={(image) => setImages((current) => current.filter((item) => item.id !== image.id))}
            onMakeMain={(image) =>
              setImages((current) => [image, ...current.filter((item) => item.id !== image.id)])
            }
          />
        </Screen>
      );
    case 'photo':
      return (
        <Screen scroll underHeader>
          <AppText variant="display">{t('photo.title')}</AppText>
          <PhotoEditor
            photoUrl={photo}
            hasOwnPhoto={photo !== null && photo !== GOOGLE_PHOTO}
            busy={false}
            onChange={() => setPhoto(sampleTile(3).url)}
            onRemove={() => setPhoto(null)}
            onUseAccountPhoto={() => setPhoto(GOOGLE_PHOTO)}
          />
        </Screen>
      );
    case 'loading':
      return (
        <Screen scroll underHeader>
          <AppText variant="display">{t('common.loading')}</AppText>
          <View style={{ height: 460 }}>
            <CardSkeleton />
          </View>
          <ListSkeleton rows={2} />
        </Screen>
      );
    case 'applications':
      return (
        <Screen scroll underHeader>
          <AppText variant="display">{t('applications.title')}</AppText>
          <ApplicationsList applications={sampleApplications(now)} now={now} />
        </Screen>
      );
  }
}
