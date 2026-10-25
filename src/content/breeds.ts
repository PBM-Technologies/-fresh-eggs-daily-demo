import type { Breed, EggColor } from '../contracts/domain';

/** Breed choices offered in the hen form. Kept short; the full guide is GUIDE_BREEDS below. */
export const BREEDS = [
  'Australorp', 'Barred Rock', 'Brahma', 'Buff Orpington', 'Cochin', 'Easter Egger', 'Leghorn', 'Marans', 'Olive Egger',
  'Plymouth Rock', 'Rhode Island Red', 'Silkie', 'Speckled Sussex', 'Sapphire Gem', 'Wyandotte', 'Golden Comet', 'Isa Brown', 'Mixed',
];
export const BIRD_EMOJI = '🐔';

export const EGG_COLORS: { value: EggColor; label: string; hex: string }[] = [
  { value: 'white', label: 'White', hex: '#f7f4ee' },
  { value: 'cream', label: 'Cream', hex: '#efe2c4' },
  { value: 'pink tint', label: 'Pink tint', hex: '#ecd2c4' },
  { value: 'light brown', label: 'Light brown', hex: '#d9b48a' },
  { value: 'brown', label: 'Brown', hex: '#b9814f' },
  { value: 'dark brown', label: 'Dark brown', hex: '#7b4a2a' },
  { value: 'speckled', label: 'Speckled', hex: '#c99a6b' },
  { value: 'blue', label: 'Blue', hex: '#a9cfd6' },
  { value: 'green', label: 'Green', hex: '#a9c69a' },
  { value: 'olive', label: 'Olive', hex: '#8f9a5c' },
];
export const eggColorHex = (c: EggColor) => EGG_COLORS.find((e) => e.value === c)?.hex ?? '#ddd';
export const eggColorLabel = (c: EggColor) => EGG_COLORS.find((e) => e.value === c)?.label ?? c;

type Defaults = Pick<Breed, 'bantamAvailable' | 'featherFeet' | 'crestOrBeard' | 'confinementTolerant'>;
const D: Defaults = { bantamAvailable: true, featherFeet: false, crestOrBeard: false, confinementTolerant: true };
const b = (x: Omit<Breed, keyof Defaults> & Partial<Defaults>): Breed => ({ ...D, ...x });

/**
 * Original Fresh Eggs Daily breed guide. Egg counts are typical mainstream estimates
 * for a healthy hen in her first laying years; individual birds and lines vary.
 */
export const GUIDE_BREEDS: Breed[] = [
  b({
    slug: 'rhode-island-red', name: 'Rhode Island Red', aliases: ['RIR', 'Rhode Island'], origin: 'United States', eggColor: 'brown', eggsPerYear: [250, 300], eggSize: 'large',
    bodySize: 'medium', temperament: 'active', coldHardy: 3, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3,
    description: 'A tough, deep red bird that has been a backyard staple for generations. Hens lay steadily through most of the year and shrug off rough weather.',
    goodToKnow: ['Hens can be bossy with gentler breeds.', 'Roosters are often assertive, so plan ahead if you keep one.', 'Production strains lay more; heritage lines are a little calmer and larger.'],
  }),
  b({
    slug: 'buff-orpington', name: 'Buff Orpington', aliases: ['Orpington', 'Buff Orp'], origin: 'England', eggColor: 'light brown', eggsPerYear: [175, 200], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 1, broody: 'high', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'Big, fluffy and golden, the Buff Orpington is famous for being easy to hold and happy to follow you around. A classic pick for families.',
    goodToKnow: ['Often goes broody, which is great for hatching and less great for egg counts.', 'Dense feathers make summer heat hard; give deep shade.', 'Gentle hens can get picked on by pushier breeds.'],
  }),
  b({
    slug: 'barred-plymouth-rock', name: 'Barred Plymouth Rock', aliases: ['Barred Rock', 'Plymouth Rock', 'Barred Rocks'], origin: 'United States', eggColor: 'light brown', eggsPerYear: [200, 280], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3,
    description: 'Crisp black and white stripes and a steady personality. A dependable layer that handles cold winters and mixes well into most flocks.',
    goodToKnow: ['Chicks are black with a white head spot.', 'Curious and talkative without being flighty.', 'A good all-rounder if you only want one breed.'],
  }),
  b({
    slug: 'white-plymouth-rock', name: 'White Plymouth Rock', aliases: ['White Rock'], origin: 'United States', eggColor: 'light brown', eggsPerYear: [200, 280], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'The all-white member of the Rock family with the same easy temperament. White feathers help a little in summer sun.',
    goodToKnow: ['Hatchery White Rocks are sometimes meat-type lines, so ask for laying stock.', 'Easy to spot against green grass at dusk roundup.'],
  }),
  b({
    slug: 'australorp', name: 'Australorp', aliases: ['Black Australorp'], origin: 'Australia', eggColor: 'light brown', eggsPerYear: [250, 300], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'Glossy black feathers with a green sheen in the sun. Australorps pair a quiet nature with excellent laying, which makes them a favorite starter bird.',
    goodToKnow: ['Black feathers soak up heat, so shade matters in summer.', 'Tolerates a run well.', 'Some hens go broody in spring.'],
  }),
  b({
    slug: 'white-leghorn', name: 'White Leghorn', aliases: ['Leghorn'], origin: 'Italy', eggColor: 'white', eggsPerYear: [280, 320], eggSize: 'large',
    bodySize: 'light', temperament: 'flighty', coldHardy: 2, heatTolerant: 3, broody: 'low', goodForBeginners: true, goodWithKids: false, purpose: 'eggs', foraging: 3, confinementTolerant: false,
    description: 'A light, alert bird bred for laying, and it shows: few breeds put more white eggs in the basket. Not a cuddler, but hardy and thrifty with feed.',
    goodToKnow: ['Large single combs can get frostbite in deep cold.', 'Good fliers; a covered run or higher fence helps.', 'Rarely goes broody.'],
  }),
  b({
    slug: 'brown-leghorn', name: 'Brown Leghorn', origin: 'Italy', eggColor: 'white', eggsPerYear: [250, 300], eggSize: 'large',
    bodySize: 'light', temperament: 'flighty', coldHardy: 2, heatTolerant: 3, broody: 'low', goodForBeginners: true, goodWithKids: false, purpose: 'eggs', foraging: 3, confinementTolerant: false,
    description: 'The wild-looking cousin of the White Leghorn, with partridge brown hens and flashy roosters. Busy foragers that keep laying in hot weather.',
    goodToKnow: ['Happiest with room to roam.', 'Watch big combs in freezing weather.', 'Lays white eggs despite brown feathers.'],
  }),
  b({
    slug: 'speckled-sussex', name: 'Speckled Sussex', aliases: ['Sussex'], origin: 'England', eggColor: 'light brown', eggsPerYear: [200, 250], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3,
    description: 'Mahogany feathers tipped with white spots that multiply with each molt. Curious, chatty hens that often come running to see what you are doing.',
    goodToKnow: ['Speckles get bolder as the bird ages.', 'Great free rangers with good predator camouflage.', 'Lays well into colder months.'],
  }),
  b({
    slug: 'light-sussex', name: 'Light Sussex', origin: 'England', eggColor: 'cream', eggsPerYear: [220, 260], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3,
    description: 'White body with a striking black neck and tail. A sturdy, easygoing hen that lays tinted eggs and handles a range of climates.',
    goodToKnow: ['Eggs range from cream to lightly tinted.', 'Settles well in mixed flocks.'],
  }),
  b({
    slug: 'silver-laced-wyandotte', name: 'Silver Laced Wyandotte', aliases: ['Wyandotte', 'SLW'], origin: 'United States', eggColor: 'light brown', eggsPerYear: [180, 240], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'Each white feather is outlined in black, giving a lacy look. A rose comb sits close to the head, so Wyandottes laugh off frosty winters.',
    goodToKnow: ['Rose comb resists frostbite.', 'Can be a little aloof but rarely aggressive.', 'Many other color patterns exist.'],
  }),
  b({
    slug: 'golden-laced-wyandotte', name: 'Golden Laced Wyandotte', origin: 'United States', eggColor: 'light brown', eggsPerYear: [180, 240], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'Rich gold feathers edged in black make this one of the prettiest dual purpose birds. Same cold hardy build as its silver sibling.',
    goodToKnow: ['Rose comb handles cold well.', 'Lovely contrast next to buff or white birds.'],
  }),
  b({
    slug: 'easter-egger', name: 'Easter Egger', aliases: ['EE', 'Easter Eggers'], origin: 'United States', eggColor: 'green', eggsPerYear: [200, 280], eggSize: 'large',
    bodySize: 'medium', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'eggs', foraging: 3, crestOrBeard: true,
    description: 'Not a formal breed but a mix carrying a blue egg gene, so every hen is a surprise. Eggs can be blue, green, olive or even pinkish, and each hen lays her own shade.',
    goodToKnow: ['Each hen lays one color for life.', 'Many have fluffy muffs and beards.', 'Sold under fancy names at farm stores; same bird.'],
  }),
  b({
    slug: 'ameraucana', name: 'Ameraucana', origin: 'United States', eggColor: 'blue', eggsPerYear: [150, 200], eggSize: 'medium',
    bodySize: 'medium', temperament: 'active', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: false, purpose: 'eggs', foraging: 3, crestOrBeard: true, confinementTolerant: false, uncommon: true,
    description: 'A recognized breed with a beard, muffs and a pea comb that lays true blue eggs. Often confused with Easter Eggers, which are mixes.',
    goodToKnow: ['Look for slate or dark legs and a beard if you want the real breed.', 'Pea comb handles cold well.', 'A bit independent; not always a lap bird.'],
  }),
  b({
    slug: 'araucana', name: 'Araucana', origin: 'Chile', eggColor: 'blue', eggsPerYear: [150, 200], eggSize: 'medium',
    bodySize: 'medium', temperament: 'active', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: false, goodWithKids: false, purpose: 'eggs', foraging: 3, crestOrBeard: true, confinementTolerant: false, uncommon: true,
    description: 'A rare, rumpless bird with tufts of feathers sprouting near the ears. Lays blue eggs and is prized by keepers who enjoy unusual breeds.',
    goodToKnow: ['True Araucanas are hard to find; many sold under the name are mixes.', 'The ear tuft gene can lower hatch rates.', 'No tail, which is normal for the breed.'],
  }),
  b({
    slug: 'olive-egger', name: 'Olive Egger', origin: 'United States', eggColor: 'olive', eggsPerYear: [180, 250], eggSize: 'large', bantamAvailable: false,
    bodySize: 'medium', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'eggs', foraging: 2,
    description: 'A cross between a blue egg layer and a dark brown egg layer, giving shells in shades of olive and moss. Looks vary a lot from bird to bird.',
    goodToKnow: ['Shade depends on the parents; darker brown parents give deeper olive.', 'A fun way to add green tones to a carton.'],
  }),
  b({
    slug: 'cream-legbar', name: 'Cream Legbar', aliases: ['Legbar'], origin: 'England', eggColor: 'blue', eggsPerYear: [180, 220], eggSize: 'medium', bantamAvailable: false,
    bodySize: 'light', temperament: 'active', coldHardy: 2, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: false, purpose: 'eggs', foraging: 3, crestOrBeard: true, confinementTolerant: false, uncommon: true,
    description: 'A crested, autosexing breed: chicks can be sorted into pullets and cockerels by down pattern at hatch. Lays pale blue eggs.',
    goodToKnow: ['Autosexing means fewer surprise roosters.', 'Active and alert; enjoys space to forage.', 'Small crest on top of the head.'],
  }),
  b({
    slug: 'black-copper-marans', name: 'Black Copper Marans', aliases: ['Marans', 'Copper Marans'], origin: 'France', eggColor: 'dark brown', eggsPerYear: [150, 200], eggSize: 'large', featherFeet: true,
    bodySize: 'heavy', temperament: 'calm', coldHardy: 2, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'Known for chocolate brown eggs, among the darkest of any breed. Black feathers with coppery hackles and often lightly feathered legs.',
    goodToKnow: ['Egg color is darkest early in the laying season and lightens over time.', 'Shade varies a lot between lines.', 'Calm, quiet hens.'],
  }),
  b({
    slug: 'welsummer', name: 'Welsummer', origin: 'Netherlands', eggColor: 'dark brown', eggsPerYear: [160, 200], eggSize: 'large',
    bodySize: 'medium', temperament: 'friendly', coldHardy: 2, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'Partridge colored hens that lay rich terracotta eggs, often with darker speckles. Friendly, clever foragers.',
    goodToKnow: ['Eggs often have freckles that rub off when wet.', 'Loves to free range.', 'Pullets and cockerels can often be told apart as chicks.'],
  }),
  b({
    slug: 'barnevelder', name: 'Barnevelder', origin: 'Netherlands', eggColor: 'dark brown', eggsPerYear: [150, 200], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 2, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'Double laced feathers create a striking pattern of brown and black. Gentle, steady hens laying deep brown eggs.',
    goodToKnow: ['A quiet breed suited to neighbors close by.', 'Egg color is best early in the season.'],
  }),
  b({
    slug: 'brahma', name: 'Brahma', aliases: ['Light Brahma', 'Dark Brahma'], origin: 'United States', eggColor: 'light brown', eggsPerYear: [120, 150], eggSize: 'large', featherFeet: true,
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 1, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'A gentle giant with feathered feet and a small pea comb. Brahmas are slow to mature but often keep laying through winter.',
    goodToKnow: ['Keep bedding dry so foot feathers stay clean.', 'Needs extra roomy nest boxes and low roosts.', 'Struggles in hot, humid summers.'],
  }),
  b({
    slug: 'cochin', name: 'Cochin', origin: 'China', eggColor: 'light brown', eggsPerYear: [100, 150], eggSize: 'medium', featherFeet: true,
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 1, broody: 'high', goodForBeginners: true, goodWithKids: true, purpose: 'ornamental', foraging: 1,
    description: 'A ball of soft feathers from head to toe. Cochins are mellow, love being near people and make devoted broody mothers.',
    goodToKnow: ['Excellent foster moms for hatching eggs.', 'Fewer eggs than production breeds.', 'Bantam Cochins are a popular small option.'],
  }),
  b({
    slug: 'silkie', name: 'Silkie', origin: 'China', eggColor: 'cream', eggsPerYear: [100, 120], eggSize: 'small', featherFeet: true, crestOrBeard: true,
    bodySize: 'light', temperament: 'friendly', coldHardy: 2, heatTolerant: 2, broody: 'high', goodForBeginners: true, goodWithKids: true, purpose: 'ornamental', foraging: 1,
    description: 'Fur-like fluff, black skin and five toes on each foot. Silkies are famously sweet, and many go broody again and again.',
    goodToKnow: ['Fluff is not waterproof; give dry shelter from rain.', 'Cannot fly, so low roosts help.', 'Crest can block vision; trim if needed.'],
  }),
  b({
    slug: 'polish', name: 'Polish', aliases: ['Polish Crested'], origin: 'Netherlands', eggColor: 'white', eggsPerYear: [150, 200], eggSize: 'medium', crestOrBeard: true,
    bodySize: 'light', temperament: 'calm', coldHardy: 1, heatTolerant: 2, broody: 'low', goodForBeginners: false, goodWithKids: true, purpose: 'ornamental', foraging: 1, uncommon: true,
    description: 'A huge pom-pom crest makes this one of the most recognizable chickens. Sweet natured but easily startled because they cannot see well.',
    goodToKnow: ['Speak before you reach in so they are not spooked.', 'Crest feathers can get wet and freeze; keep them dry.', 'Can be picked on by bolder breeds.'],
  }),
  b({
    slug: 'faverolles', name: 'Salmon Faverolles', aliases: ['Faverolles', 'Faverolle'], origin: 'France', eggColor: 'pink tint', eggsPerYear: [150, 200], eggSize: 'medium', featherFeet: true, crestOrBeard: true,
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 1, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'Bearded, muffed and feather footed with five toes. Faverolles are goofy, gentle birds that lay tinted eggs and handle cold well.',
    goodToKnow: ['Low in the pecking order; pair with calm flockmates.', 'Hens and roosters look very different by a few weeks old.', 'Prefers shade in summer.'],
  }),
  b({
    slug: 'jersey-giant', name: 'Jersey Giant', origin: 'United States', eggColor: 'brown', eggsPerYear: [150, 200], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 1, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'Among the largest chicken breeds, built tall and broad. Despite the size they are easygoing and steady winter layers.',
    goodToKnow: ['Needs sturdy, low roosts and bigger nest boxes.', 'Slow to reach full size.', 'Eats more feed than lighter breeds.'],
  }),
  b({
    slug: 'new-hampshire-red', name: 'New Hampshire Red', aliases: ['New Hampshire'], origin: 'United States', eggColor: 'brown', eggsPerYear: [200, 250], eggSize: 'large',
    bodySize: 'medium', temperament: 'active', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3,
    description: 'Developed from Rhode Island Reds for faster growth, with lighter chestnut feathers. Lively, hardy and a solid layer.',
    goodToKnow: ['Slightly more likely to go broody than RIRs.', 'Can be competitive at the feeder.'],
  }),
  b({
    slug: 'delaware', name: 'Delaware', origin: 'United States', eggColor: 'brown', eggsPerYear: [200, 250], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'White body with black flecks on the neck and tail. A heritage dual purpose bird that is friendly and lays well.',
    goodToKnow: ['A heritage breed worth keeping going.', 'Calm enough for small runs.'],
  }),
  b({
    slug: 'dominique', name: 'Dominique', aliases: ['Dominiker'], origin: 'United States', eggColor: 'light brown', eggsPerYear: [200, 250], eggSize: 'medium',
    bodySize: 'medium', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, uncommon: true,
    description: 'One of the oldest American breeds, with a soft cuckoo barring and a rose comb. Thrifty foragers that handle cold winters.',
    goodToKnow: ['Rose comb sets it apart from the Barred Rock.', 'Good camouflage when free ranging.'],
  }),
  b({
    slug: 'isa-brown', name: 'ISA Brown', aliases: ['Isa Brown', 'ISA'], origin: 'France', eggColor: 'brown', eggsPerYear: [280, 320], eggSize: 'large', bantamAvailable: false,
    bodySize: 'medium', temperament: 'friendly', coldHardy: 2, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'eggs', foraging: 2,
    description: 'A commercial brown egg hybrid bred to lay early and often. Very friendly and easy to handle.',
    goodToKnow: ['Laying slows sooner with age than heritage breeds.', 'Can be prone to reproductive problems after a few years of heavy laying.', 'Sex linked, so chicks are sorted at hatch.'],
  }),
  b({
    slug: 'golden-comet', name: 'Golden Comet', aliases: ['Comet'], origin: 'United States', eggColor: 'brown', eggsPerYear: [250, 300], eggSize: 'large', bantamAvailable: false,
    bodySize: 'medium', temperament: 'friendly', coldHardy: 2, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'eggs', foraging: 2,
    description: 'A sex linked hybrid that starts laying young and keeps going. Sweet, people oriented hens that suit first flocks.',
    goodToKnow: ['Peak production lasts a few years, then tapers.', 'Chicks are sexed by color at hatch.'],
  }),
  b({
    slug: 'red-sex-link', name: 'Red Sex Link', aliases: ['Red Star', 'Sex Link'], origin: 'United States', eggColor: 'brown', eggsPerYear: [250, 300], eggSize: 'large', bantamAvailable: false,
    bodySize: 'medium', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'eggs', foraging: 2,
    description: 'A cross bred so pullets and cockerels hatch in different colors. Hens are reddish with white accents and lay heavily.',
    goodToKnow: ['Offspring will not breed true.', 'A no-fuss choice for steady eggs.'],
  }),
  b({
    slug: 'black-sex-link', name: 'Black Sex Link', aliases: ['Black Star'], origin: 'United States', eggColor: 'brown', eggsPerYear: [250, 300], eggSize: 'large', bantamAvailable: false,
    bodySize: 'medium', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'eggs', foraging: 2,
    description: 'Black hens with gold on the neck, from a red rooster crossed with a barred hen. Hardy, calm and productive.',
    goodToKnow: ['Pullets hatch solid black; cockerels have a white head spot.', 'Handles cold well.'],
  }),
  b({
    slug: 'black-orpington', name: 'Black Orpington', origin: 'England', eggColor: 'light brown', eggsPerYear: [175, 200], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 1, broody: 'high', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2,
    description: 'The original Orpington color, with a beetle green sheen in sunlight. Big, soft and mellow, just like the buff variety.',
    goodToKnow: ['Needs shade in hot weather.', 'Often broody.'],
  }),
  b({
    slug: 'lavender-orpington', name: 'Lavender Orpington', origin: 'England', eggColor: 'light brown', eggsPerYear: [150, 200], eggSize: 'large',
    bodySize: 'heavy', temperament: 'friendly', coldHardy: 3, heatTolerant: 1, broody: 'high', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'A soft dove gray Orpington with the breed’s easy nature. A showpiece in any backyard flock.',
    goodToKnow: ['Lavender breeds true, so chicks match the parents.', 'Feathers can look ragged in sun; shade keeps color even.'],
  }),
  b({
    slug: 'partridge-plymouth-rock', name: 'Partridge Plymouth Rock', aliases: ['Partridge Rock'], origin: 'United States', eggColor: 'light brown', eggsPerYear: [180, 250], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'The steady Rock body in a rich mahogany pattern with fine black penciling. Calm, hardy and decorative.',
    goodToKnow: ['Same easygoing nature as Barred Rocks.', 'Feather pattern is beautiful up close.'],
  }),
  b({
    slug: 'ancona', name: 'Ancona', origin: 'Italy', eggColor: 'white', eggsPerYear: [200, 250], eggSize: 'medium',
    bodySize: 'light', temperament: 'flighty', coldHardy: 2, heatTolerant: 3, broody: 'low', goodForBeginners: false, goodWithKids: false, purpose: 'eggs', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'Black feathers tipped with white, on a light, quick bird. A thrifty layer of white eggs that loves to roam.',
    goodToKnow: ['Strong flier; clip or cover the run.', 'Handles heat well.'],
  }),
  b({
    slug: 'minorca', name: 'Minorca', origin: 'Spain', eggColor: 'white', eggsPerYear: [200, 220], eggSize: 'extra large',
    bodySize: 'medium', temperament: 'active', coldHardy: 1, heatTolerant: 3, broody: 'low', goodForBeginners: false, goodWithKids: false, purpose: 'eggs', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'Tall and glossy with large white earlobes and a big comb. Lays some of the largest white eggs of any breed.',
    goodToKnow: ['Big combs are frostbite prone in cold climates.', 'Best in warm regions.'],
  }),
  b({
    slug: 'hamburg', name: 'Hamburg', origin: 'Netherlands and Germany', eggColor: 'white', eggsPerYear: [200, 220], eggSize: 'small',
    bodySize: 'light', temperament: 'flighty', coldHardy: 2, heatTolerant: 3, broody: 'low', goodForBeginners: false, goodWithKids: false, purpose: 'eggs', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'A small, elegant bird with spangled or penciled feathers. Lively, independent and a steady layer of small white eggs.',
    goodToKnow: ['Flies well and likes to roost high.', 'Happiest free ranging.'],
  }),
  b({
    slug: 'campine', name: 'Campine', origin: 'Belgium', eggColor: 'white', eggsPerYear: [150, 200], eggSize: 'medium',
    bodySize: 'light', temperament: 'active', coldHardy: 2, heatTolerant: 2, broody: 'low', goodForBeginners: false, goodWithKids: false, purpose: 'eggs', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'A rare, finely barred Belgian breed. Alert and independent, with roosters that look much like hens.',
    goodToKnow: ['Hard to find; usually from specialty breeders.', 'Prefers room to roam.'],
  }),
  b({
    slug: 'sebright', name: 'Sebright', origin: 'England', eggColor: 'white', eggsPerYear: [60, 80], eggSize: 'small',
    bodySize: 'bantam only', temperament: 'active', coldHardy: 1, heatTolerant: 2, broody: 'medium', goodForBeginners: false, goodWithKids: true, purpose: 'ornamental', foraging: 2, uncommon: true,
    description: 'A tiny true bantam with laced gold or silver feathers. Kept mainly for beauty rather than eggs.',
    goodToKnow: ['Very small and can fly; secure housing matters.', 'Feels the cold; give a draft-free coop.', 'Lays few, small eggs.'],
  }),
  b({
    slug: 'naked-neck', name: 'Naked Neck', aliases: ['Turken'], origin: 'Romania', eggColor: 'light brown', eggsPerYear: [150, 200], eggSize: 'large',
    bodySize: 'medium', temperament: 'calm', coldHardy: 1, heatTolerant: 3, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, uncommon: true,
    description: 'A bare red neck gives this bird its odd look and helps it shed heat. Easygoing, hardy and a good forager.',
    goodToKnow: ['One of the best breeds for hot summers.', 'Not related to turkeys despite the nickname.', 'Bare skin can sunburn or chill; give shelter.'],
  }),
  b({
    slug: 'bielefelder', name: 'Bielefelder', origin: 'Germany', eggColor: 'brown', eggsPerYear: [200, 230], eggSize: 'extra large', bantamAvailable: false,
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, uncommon: true,
    description: 'A large, gentle, autosexing German breed with a cuckoo pattern over red and gold. Lays big brown eggs.',
    goodToKnow: ['Chicks can be sexed by down color at hatch.', 'Very docile for its size.'],
  }),
  b({
    slug: 'swedish-flower-hen', name: 'Swedish Flower Hen', origin: 'Sweden', eggColor: 'cream', eggsPerYear: [150, 200], eggSize: 'large', bantamAvailable: false, crestOrBeard: true,
    bodySize: 'medium', temperament: 'friendly', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'A landrace with white tipped feathers that look like scattered flowers. No two birds look alike, and some carry a small crest.',
    goodToKnow: ['Hardy and self reliant foragers.', 'Colors vary widely within the breed.'],
  }),
  b({
    slug: 'mille-fleur-duccle', name: "Mille Fleur d'Uccle", aliases: ["d'Uccle", 'Mille Fleur'], origin: 'Belgium', eggColor: 'cream', eggsPerYear: [100, 150], eggSize: 'small', featherFeet: true, crestOrBeard: true,
    bodySize: 'bantam only', temperament: 'friendly', coldHardy: 2, heatTolerant: 2, broody: 'high', goodForBeginners: true, goodWithKids: true, purpose: 'ornamental', foraging: 1, uncommon: true,
    description: 'A bearded, booted bantam whose name means a thousand flowers, for its orange, black and white spotting. Tiny and charming.',
    goodToKnow: ['Feathered feet need dry footing.', 'Great for small spaces and gentle kids.'],
  }),
  b({
    slug: 'chantecler', name: 'Chantecler', origin: 'Canada', eggColor: 'brown', eggsPerYear: [150, 200], eggSize: 'large',
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 1, broody: 'low', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 2, uncommon: true,
    description: 'Bred in Canada for brutal winters, with a tiny cushion comb and small wattles. Keeps laying when it is bitterly cold.',
    goodToKnow: ['Among the most cold hardy breeds.', 'Less suited to hot climates.'],
  }),
  b({
    slug: 'buckeye', name: 'Buckeye', origin: 'United States', eggColor: 'brown', eggsPerYear: [150, 200], eggSize: 'medium',
    bodySize: 'medium', temperament: 'active', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, confinementTolerant: false, uncommon: true,
    description: 'A heritage breed the color of the Ohio buckeye nut, with a pea comb. Energetic foragers that are known to hunt mice.',
    goodToKnow: ['Pea comb handles cold well.', 'Happier with space to explore.'],
  }),
  b({
    slug: 'java', name: 'Java', origin: 'United States', eggColor: 'brown', eggsPerYear: [150, 200], eggSize: 'large', bantamAvailable: false,
    bodySize: 'heavy', temperament: 'calm', coldHardy: 3, heatTolerant: 2, broody: 'medium', goodForBeginners: true, goodWithKids: true, purpose: 'dual', foraging: 3, uncommon: true,
    description: 'One of the oldest American breeds, usually black with a green sheen or mottled. Calm, sturdy and a good forager.',
    goodToKnow: ['A heritage breed that conservation groups encourage keeping.', 'Slow to mature.'],
  }),
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const INDEX = new Map<string, Breed>();
for (const br of GUIDE_BREEDS) {
  INDEX.set(norm(br.name), br);
  INDEX.set(norm(br.slug), br);
  for (const a of br.aliases ?? []) if (!INDEX.has(norm(a))) INDEX.set(norm(a), br);
}

/** Finds a guide breed by name, slug or alias, case and punctuation insensitive. */
export function findBreed(name: string | undefined | null): Breed | undefined {
  if (!name) return undefined;
  return INDEX.get(norm(name)) ?? INDEX.get(norm(name.replace(/s$/i, '')));
}
export const breedBySlug = (slug: string) => GUIDE_BREEDS.find((x) => x.slug === slug);
