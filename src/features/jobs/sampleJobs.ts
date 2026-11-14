import type { JobCardData } from './JobCard';
import type { JobDetailData } from './JobDetail';

/** A plain coloured rectangle, standing in for a photo so the preview needs no files. */
const tile = (colour: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300'%3E%3Crect width='600' height='300' fill='${colour}'/%3E%3C/svg%3E`;

/**
 * Sample jobs for the development preview page only. They are written in the
 * three languages employers will write in, to check that mixed-language
 * content sits correctly on the card.
 */
/** One job in full, for the detail screen in the preview. */
export function sampleDetail(now: number): JobDetailData {
  const [first] = sampleJobs(now);
  return {
    ...first,
    status: 'open',
    openings: 2,
    startsNow: true,
    workingTimes: ['evening', 'night'],
    daysPerWeek: 5,
    benefits: ['meals', 'transport', 'insurance'],
    experience: 'some',
    languages: ['fr', 'en'],
    location: { latitude: 36.4, longitude: 10.6167 },
    imageUrls: first.imageUrls ?? [],
    companyAddress: 'Avenue des Nations Unies, Hammamet',
    companyLogoUrl: first.companyLogoUrl ?? null,
  };
}

export function sampleJobs(now: number): JobCardData[] {
  const minutes = (n: number) => now - n * 60_000;
  return [
    {
      _id: 'sample-1',
      title: 'Réceptionniste de nuit',
      description:
        "Accueil des clients, gestion des arrivées tardives et du standard. Français et anglais demandés. Poste de 22h à 6h, deux jours de repos par semaine.",
      category: 'hospitality',
      contractType: 'full_time',
      payAmount: 950,
      payPeriod: 'month',
      publishedAt: minutes(12),
      distanceM: 650,
      companyName: 'Hôtel Les Orangers',
      // Plain coloured tiles stand in for a logo and three photos.
      companyLogoUrl: tile('%23FFD166'),
      imageUrls: [tile('%231557B8'), tile('%230E7A4B'), tile('%2351607A')],
      openings: 2,
      startsNow: true,
      benefits: ['meals', 'transport', 'insurance'],
    },
    {
      _id: 'sample-2',
      title: 'نادل في قهوة',
      description: 'نلوّجو على نادل ولا نادلة للخدمة في العشية. الخبرة موش لازمة، المهم الجدّية و الوقت.',
      category: 'restaurant',
      contractType: 'part_time',
      payAmount: 25,
      payPeriod: 'day',
      publishedAt: minutes(95),
      distanceM: 1240,
      companyName: 'قهوة سيدي بوحديد',
    },
    {
      _id: 'sample-3',
      title: 'Pool attendant',
      description: 'Summer season, June to September. Keeping the pool area tidy and helping guests. Swimming required.',
      category: 'hospitality',
      contractType: 'seasonal',
      payAmount: 4.5,
      payPeriod: 'hour',
      publishedAt: minutes(60 * 26),
      distanceM: 2870,
      companyName: 'Yasmine Beach Resort',
    },
    {
      _id: 'sample-4',
      title: 'Livreur à scooter',
      description: 'Livraisons dans Hammamet et Nabeul. Scooter fourni. Permis A1 obligatoire.',
      category: 'logistics',
      contractType: 'temporary',
      payAmount: 35,
      payPeriod: 'day',
      publishedAt: minutes(60 * 24 * 9),
      distanceM: 4310,
      companyName: 'Rapido Hammamet',
    },
  ];
}
