import { StoryPost, ADMIN_EMAIL } from '../types';

function createMonochromeArtwork(title: string, subtitle: string, variant: number): string {
  const patterns = [
    `<circle cx="400" cy="300" r="160" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.35"/>
     <circle cx="400" cy="300" r="95" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2"/>
     <line x1="120" y1="300" x2="680" y2="300" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2"/>`,
    `<rect x="220" y="120" width="360" height="360" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.3"/>
     <rect x="270" y="170" width="260" height="260" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.18"/>
     <line x1="220" y1="120" x2="580" y2="480" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2"/>`,
    `<path d="M 120 440 Q 400 120 680 440" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.35"/>
     <path d="M 160 460 Q 400 200 640 460" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.2"/>
     <circle cx="400" cy="240" r="42" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.4"/>`,
    `<line x1="160" y1="140" x2="640" y2="140" stroke="#ffffff" stroke-width="1" stroke-opacity="0.25"/>
     <line x1="160" y1="220" x2="640" y2="220" stroke="#ffffff" stroke-width="1" stroke-opacity="0.25"/>
     <line x1="160" y1="300" x2="640" y2="300" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4"/>
     <line x1="160" y1="380" x2="640" y2="380" stroke="#ffffff" stroke-width="1" stroke-opacity="0.25"/>
     <circle cx="520" cy="300" r="64" fill="#18181b" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.45"/>`,
  ];

  const pattern = patterns[variant % patterns.length];
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSub = subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#09090b"/>
        <stop offset="50%" stop-color="#18181b"/>
        <stop offset="100%" stop-color="#09090b"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg)"/>
    <g>${pattern}</g>
    <text x="64" y="84" fill="#a1a1aa" font-family="sans-serif" font-size="13" letter-spacing="3">${safeSub.toUpperCase()}</text>
    <text x="64" y="528" fill="#fafafa" font-family="Georgia, serif" font-size="28" font-weight="600">${safeTitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_STORIES: StoryPost[] = [
  {
    id: 'silence-of-concrete-harbors',
    title: 'The Silence of Concrete Harbors at First Light',
    slug: 'silence-of-concrete-harbors',
    excerpt: 'An exploration of brutalist coastal breakwaters before the morning tide shifts along the northern peninsula.',
    content: `Before the fishing vessels ignite their engines and before the coastal wind stirs the surface of the bay, the breakwaters stand in near-total stillness. Built from poured aggregate fifty winters ago, these monolithic walls were designed to absorb the violence of seasonal typhoons while asking nothing in return.

Walking the length of the outer pier at five in the morning reveals how architecture ages when left to salt and mist. Every seam in the concrete holds a tiny tide pool, reflecting the pale silver sky like fragments of polished slate.

Local watchmen speak of the harbor as a living barometer. When a low-pressure front approaches from the east, the hollow chambers beneath the seawall resonate with a deep, unmistakable hum hours before the first wave strikes. In that quiet interval, light and shadow carve the pier into stark geometric planes—a study in endurance written in stone and water.`,
    category: 'Architecture',
    collection: 'Monochrome Coastlines',
    coverImage: createMonochromeArtwork('The Silence of Concrete Harbors', 'Architecture · 01', 0),
    images: [
      createMonochromeArtwork('The Silence of Concrete Harbors', 'Architecture · Plate I', 0),
      createMonochromeArtwork('Breakwater Geometry at Dawn', 'Architecture · Plate II', 1),
    ],
    authorEmail: ADMIN_EMAIL,
    createdAt: new Date('2026-10-30T10:00:00Z'),
    updatedAt: new Date('2026-10-30T10:00:00Z'),
    isSeed: true,
  },
  {
    id: 'letters-from-the-high-observatory',
    title: 'Letters Kept in the High Altitude Observatory',
    slug: 'letters-from-the-high-observatory',
    excerpt: 'Inside the archival notebooks left by astronomers who spent winter solstices above the cloud line.',
    content: `At three thousand meters above sea level, winter arrives in October and lingers until May. For decades, astronomers rotated through the ridge observatory in pairs, recording stellar spectra on glass photographic plates while snowdrifts buried the lower walkways.

In the cedar cabinets beside the meridian transit room, dozens of cloth-bound logbooks remain intact. Alongside meticulous tables of right ascension and barometric pressure, the observers left personal marginalia: sketches of parhelia at sunrise, notes on the clarity of the night air after a blizzard, and quiet reflections on solitude.

What strikes the modern reader is the patience required by their craft. A single exposure of a faint nebula demanded four hours of manual guiding in sub-zero darkness. Those logbooks remind us that discovery is rarely a sudden flash—it is the slow accumulation of attentive nights.`,
    category: 'Chronicles',
    collection: 'Winter Archives',
    coverImage: createMonochromeArtwork('Letters from the High Observatory', 'Chronicles · 02', 2),
    images: [
      createMonochromeArtwork('Letters from the High Observatory', 'Chronicles · Plate I', 2),
    ],
    authorEmail: ADMIN_EMAIL,
    createdAt: new Date('2026-10-29T16:30:00Z'),
    updatedAt: new Date('2026-10-29T16:30:00Z'),
    isSeed: true,
  },
  {
    id: 'nocturne-in-silver-gelatin',
    title: 'Nocturne in Silver Gelatin: Streetlamps After Rain',
    slug: 'nocturne-in-silver-gelatin',
    excerpt: 'How wet cobblestones and sodium vapor lamps transform empty midnight avenues into a study of contrast.',
    content: `Rain after midnight strips a city of its distractions. Signage blurs into wet asphalt, footsteps fade under the steady patter against awnings, and every streetlamp becomes an isolated stage light.

Working exclusively with medium-format film and long exposures, this series documents the old railway district between midnight and three in the morning. Without pedestrians or traffic to anchor the frame, doorways, iron viaducts, and brick alleys take on a timeless theatrical stillness.

In the darkroom, printing on fiber-based paper allows the deepest shadows to retain subtle texture while wet highlights gleam like burnished pewter. Each photograph is a quiet record of a city pausing to breathe.`,
    category: 'Photography',
    collection: 'Night Studies',
    coverImage: createMonochromeArtwork('Nocturne in Silver Gelatin', 'Photography · 03', 3),
    images: [
      createMonochromeArtwork('Nocturne in Silver Gelatin', 'Photography · Plate I', 3),
    ],
    authorEmail: ADMIN_EMAIL,
    createdAt: new Date('2026-10-28T14:15:00Z'),
    updatedAt: new Date('2026-10-28T14:15:00Z'),
    isSeed: true,
  },
  {
    id: 'the-clockmakers-workshop-in-geneva',
    title: 'The Last Pendulum Maker of the Old Quarter',
    slug: 'the-clockmakers-workshop-in-geneva',
    excerpt: 'A portrait of a fourth-generation horologist restoring regulator clocks by north-facing window light.',
    content: `Three flights above a narrow courtyard, the workbench runs the entire length of a north-facing window. North light never casts harsh moving shadows across a brass escapement; it offers an even, cool illumination from morning until dusk.

Here, regulator clocks from the nineteenth century are disassembled down to their smallest pinions. Every tooth is inspected under a loupe, cleaned in elderberry pith, and polished until friction is nearly eliminated.

In an era of atomic timekeeping, the appeal of a mechanical pendulum lies in its physical honesty. You can see the weight descend, hear the pallet fork release the wheel, and witness time measured through gravity and human patience.`,
    category: 'Craft',
    collection: 'Living Artisans',
    coverImage: createMonochromeArtwork('The Last Pendulum Maker', 'Craft · 04', 1),
    images: [
      createMonochromeArtwork('The Last Pendulum Maker', 'Craft · Plate I', 1),
    ],
    authorEmail: ADMIN_EMAIL,
    createdAt: new Date('2026-10-27T09:45:00Z'),
    updatedAt: new Date('2026-10-27T09:45:00Z'),
    isSeed: true,
  },
  {
    id: 'glasshouses-of-the-northern-botanic-garden',
    title: 'Iron and Mist: Inside the Victorian Palm House',
    slug: 'glasshouses-of-the-northern-botanic-garden',
    excerpt: 'Cast-iron ribs and condensation create a monochromatic cathedral of tropical flora in mid-winter.',
    content: `When frost coats the lawns outside, stepping through the vestibule of the 1884 Palm House feels like entering a suspended climate. Warm moisture rises from volcanic gravel paths and condenses against thousands of hand-cut panes overhead.

Seen from the upper iron catwalk, the curvature of the glass vault dissolves into white mist. Fronds of giant cycads and fan palms press against the translucent panes like botanical photograms, their silhouettes sharp against the winter sky.`,
    category: 'Architecture',
    collection: 'Winter Archives',
    coverImage: createMonochromeArtwork('Iron and Mist: The Palm House', 'Architecture · 05', 0),
    images: [
      createMonochromeArtwork('Iron and Mist: The Palm House', 'Architecture · Plate I', 0),
    ],
    authorEmail: ADMIN_EMAIL,
    createdAt: new Date('2026-10-26T18:20:00Z'),
    updatedAt: new Date('2026-10-26T18:20:00Z'),
    isSeed: true,
  },
  {
    id: 'typography-of-maritime-charts',
    title: 'Soundings and Serif: The Typography of Nautical Charts',
    slug: 'typography-of-maritime-charts',
    excerpt: 'Why copperplate engravers chose specific italic numerals to warn mariners of shoals and tidal currents.',
    content: `Every numeral on a nineteenth-century hydrographic chart carried life-or-death weight. Copperplate engravers worked in reverse, carving depth soundings, compass roses, and coastal profiles into polished copper sheets with burins sharpened by hand.

To distinguish underwater hazards from landmass elevations, cartographers developed a strict typographic grammar: upright Roman capitals for headlands and lighthouses, hairline italics for submerged reefs, and stippled contour lines indicating fathom intervals.`,
    category: 'Design',
    collection: 'Monochrome Coastlines',
    coverImage: createMonochromeArtwork('Typography of Nautical Charts', 'Design · 06', 3),
    images: [
      createMonochromeArtwork('Typography of Nautical Charts', 'Design · Plate I', 3),
    ],
    authorEmail: ADMIN_EMAIL,
    createdAt: new Date('2026-10-25T11:10:00Z'),
    updatedAt: new Date('2026-10-25T11:10:00Z'),
    isSeed: true,
  },
];
