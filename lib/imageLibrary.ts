// lib/imageLibrary.ts
// Curated, topic-specific Unsplash image palettes for generated websites.
// Each category has hero (1200×600), card (600×400), and portrait (400×400) images
// that match the actual subject matter of the site being built.
//
// Usage:
//   const block = getImagePaletteBlock(userPrompt)
//   if (block) inject into system prompt before generation

// ── Types ────────────────────────────────────────────────────────────────────

interface ImagePalette {
  category: string       // Human-readable label, e.g. "BARBERSHOP"
  hero: string[]         // 1200×600 — hero sections, page headers
  cards: string[]        // 600×400 — service/product/feature cards
  portraits: string[]    // 400×400 — team members, testimonial avatars
}

// ── Unsplash URL builder ──────────────────────────────────────────────────────

const U = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&auto=format&fit=crop&q=80`

const hero     = (id: string) => U(id, 1200, 600)
const card     = (id: string) => U(id,  600, 400)
const portrait = (id: string) => U(id,  400, 400)

// ── Image library ─────────────────────────────────────────────────────────────

const LIBRARY: Record<string, ImagePalette> = {

  barbershop: {
    category: 'BARBERSHOP / HAIR SALON',
    hero: [
      hero('1503951914875-452162b0f3f1'),  // barber cutting hair
      hero('1517832207-1b1c7ae4bb7c'),     // barbershop interior
      hero('1599351736804-ab3b8dae3248'),  // hair cutting close-up
    ],
    cards: [
      card('1521576963640-d2a847f3cc51'),  // haircut result
      card('1605497788044-5a32c7078486'),  // razor & scissors
      card('1621605815971-a19252db6cd8'),  // hair color
      card('1593702288056-a9a6a58a6cf2'),  // modern barbershop
    ],
    portraits: [
      portrait('1507003211169-0a1dd7228f2d'),  // male barber
      portrait('1500648767791-00dcc994a43e'),  // male stylist
      portrait('1580489944761-15a19d654956'),  // female stylist
    ],
  },

  restaurant: {
    category: 'RESTAURANT / DINING',
    hero: [
      hero('1567620905732-2d1ec7ab7445'),  // food spread on table
      hero('1414235077428-338989a2e8c0'),  // restaurant interior
      hero('1504674900247-0877df9cc836'),  // plated food
    ],
    cards: [
      card('1565299507177-b0ac66763828'),  // burger
      card('1540189548866-cf75c21b3af3'),  // pasta dish
      card('1551218808-21b6a4c6dd75'),     // pizza
      card('1476224203421-74177f9e9c40'),  // gourmet plate
    ],
    portraits: [
      portrait('1577219491135-ce391730fb2c'),  // chef in whites
      portrait('1571106614736-3d5ca7ce7cb5'),  // sous chef
      portrait('1583394293253-1c3c8d7a4ce7'),  // waiter
    ],
  },

  cafe_bakery: {
    category: 'CAFÉ / COFFEE SHOP / BAKERY / CAKE SHOP',
    hero: [
      hero('1578985545062-6e5e57f6b5e5'),  // elegant layered cake
      hero('1495474472287-4d71bcdd2085'),  // cafe interior
      hero('1501339847302-ac426a4a7cbb'),  // coffee with latte art
    ],
    cards: [
      card('1565958011703-44f9829ba187'),  // beautiful cake slice
      card('1519975258993-60b42d1c2ee2'),  // fresh pastries
      card('1464219789935-c2d9d9aea5b2'),  // croissants
      card('1509042239860-f7a671399e1e'),  // flat white coffee
      card('1571115764595-644a1f56a516'),  // decorated cupcakes
      card('1586788680434-30d324b2d46f'),  // wedding cake
    ],
    portraits: [
      portrait('1607990283144-0097c51a2aa8'),  // baker
      portrait('1580489944761-15a19d654956'),  // pastry chef (female)
      portrait('1511366820374-db428d977ac7'),  // barista
    ],
  },

  gym_fitness: {
    category: 'GYM / FITNESS CENTER',
    hero: [
      hero('1571019614242-c5c5dee9f50b'),  // fitness training
      hero('1517836357463-d25dfeac3438'),  // weightlifting
      hero('1534438327415-a5b54b3ae3fd'),  // gym equipment
    ],
    cards: [
      card('1581009137042-c6f3422fad1b'),  // dumbbell exercise
      card('1574680096145-d05b474e2155'),  // group class
      card('1549060279-7e168fcee0c2'),     // running on treadmill
      card('1526506118085-60ce8714f8c5'),  // personal training
    ],
    portraits: [
      portrait('1594381898411-846e7d193883'),  // male trainer
      portrait('1566661194617-a6ef5d5a7cfe'),  // female trainer
      portrait('1590507621108-433608c97823'),  // fitness coach
    ],
  },

  medical: {
    category: 'MEDICAL / HEALTHCARE / DENTAL',
    hero: [
      hero('1576091160399-112ba8d25d1d'),  // medical professional
      hero('1551190822-a9333d879b1f'),     // modern hospital
      hero('1559757148-5c350d0d3c56'),     // medical equipment
    ],
    cards: [
      card('1631815585552-3e8ba04a7b1c'),  // stethoscope
      card('1576671081837-49000212a616'),  // lab results
      card('1559757148-5c350d0d3c56'),     // healthcare
      card('1504813184591-a3e2d8c16baf'),  // consultation
    ],
    portraits: [
      portrait('1612349317150-e413f6a5b16d'),  // doctor (male)
      portrait('1582750433449-648ed127bb54'),  // nurse (female)
      portrait('1559839734-2b71ea197ec2'),     // healthcare worker
    ],
  },

  law_firm: {
    category: 'LAW FIRM / LEGAL SERVICES',
    hero: [
      hero('1589829545856-d10d557cf95f'),  // law library
      hero('1521587760703-a686f47a5bcc'),  // courthouse
      hero('1450101499163-c8848c66ca85'),  // legal office
    ],
    cards: [
      card('1554224155-6726b3ff858f'),     // legal/finance charts
      card('1507209996422-a1937a4a3b8e'),  // documents
      card('1554469384-e58fac16e23a'),     // contract signing
      card('1436450412741-6b59ad3fa5a3'),  // scales of justice
    ],
    portraits: [
      portrait('1560250097-0b93528c311a'),     // male attorney
      portrait('1573496359142-b8d87734a5a2'),  // female attorney
      portrait('1519085360753-af0119f7cbe7'),  // lawyer
    ],
  },

  real_estate: {
    category: 'REAL ESTATE / PROPERTY',
    hero: [
      hero('1560518883-ce09059eeffa'),  // luxury house exterior
      hero('1512917774080-9991f1c4c750'),  // modern home
      hero('1560184897-ae75f418493e'),    // interior living room
    ],
    cards: [
      card('1582407947304-d3bba3ea1bae'),  // house front
      card('1570129477492-45c003edd2be'),  // apartment building
      card('1513584684374-8bab748fbf90'),  // bedroom
      card('1558618666-fcd25c85cd64'),     // kitchen
    ],
    portraits: [
      portrait('1560250097-0b93528c311a'),     // male realtor
      portrait('1573496359142-b8d87734a5a2'),  // female realtor
      portrait('1489424731084-a5d8b0c6f7a2'),  // agent
    ],
  },

  photography: {
    category: 'PHOTOGRAPHY / PHOTO STUDIO',
    hero: [
      hero('1452587925148-ce544e77e70d'),  // camera gear
      hero('1471341971476-ae15ff5dd4ea'),  // photographer at work
      hero('1516035069371-29a1b244cc32'),  // professional photoshoot
    ],
    cards: [
      card('1606983340126-99ab4feaa64a'),  // photo studio setup
      card('1515630771600-ced93f43dc52'),  // camera equipment
      card('1581447109200-bf2769116351'),  // portrait session
      card('1509822929458-d0e0f9b82d4e'),  // landscape photography
    ],
    portraits: [
      portrait('1607990281966-b1d8e34f8a3f'),  // photographer (male)
      portrait('1573496359142-b8d87734a5a2'),  // photographer (female)
      portrait('1507003211169-0a1dd7228f2d'),  // creative director
    ],
  },

  wedding_events: {
    category: 'WEDDING / EVENTS',
    hero: [
      hero('1519741347686-efa52f4cd5ce'),  // outdoor wedding ceremony
      hero('1465495976277-a387a3ae6a02'),  // elegant reception
      hero('1520854221256-17ec6eab5b82'),  // bridal party
    ],
    cards: [
      card('1522673814-52c3ed1d35ed'),     // floral arrangement
      card('1519225421880-4bb9fac1a8d7'),  // wedding cake
      card('1512436991641-6328c9e01257'),  // bridal bouquet
      card('1529636798458-0748d2ae3e9d'),  // table setting
    ],
    portraits: [
      portrait('1519741347686-efa52f4cd5ce'),  // bride and groom
      portrait('1573496359142-b8d87734a5a2'),  // wedding planner
      portrait('1507003211169-0a1dd7228f2d'),  // event coordinator
    ],
  },

  tech_startup: {
    category: 'TECH STARTUP / SOFTWARE / SAAS',
    hero: [
      hero('1518770660439-4636190af475'),  // circuit board / tech
      hero('1499750310190-f32a5931ef73'),  // laptop / workspace
      hero('1461749280684-dccba630e2f6'),  // coding on screen
    ],
    cards: [
      card('1593642632659-14c8e672fce3'),  // desktop setup
      card('1581091226825-a6a2a5aee158'),  // dashboard UI
      card('1551434678-e076c223a692'),     // software development
      card('1518770660439-4636190af475'),  // technology
    ],
    portraits: [
      portrait('1560250097-0b93528c311a'),     // male developer
      portrait('1573496359142-b8d87734a5a2'),  // female developer
      portrait('1519085360753-af0119f7cbe7'),  // tech executive
    ],
  },

  fashion: {
    category: 'FASHION / BOUTIQUE / CLOTHING',
    hero: [
      hero('1483985988355-763728e1feb0'),  // fashion editorial
      hero('1490481651871-ab68de25d43d'),  // clothing rail
      hero('1445205170230-053b83016050'),  // boutique interior
    ],
    cards: [
      card('1542291026-7eec264c27ff'),  // shoes
      card('1523381294911-8d3cead13475'),  // handbag
      card('1581044777550-4cfa2bce5af6'),  // accessories
      card('1594938298603-f8c2b91c3085'),  // styled outfit
    ],
    portraits: [
      portrait('1509631179647-0177331693ae'),  // fashion model (female)
      portrait('1546961342-ea5f89cae2be'),     // male model
      portrait('1580489944761-15a19d654956'),  // stylist
    ],
  },

  beauty_spa: {
    category: 'SPA / BEAUTY SALON / WELLNESS',
    hero: [
      hero('1560750588-73207b1ef5b8'),  // spa treatment room
      hero('1470259078422-826894b933aa'),  // beauty salon
      hero('1519824145371-1f4d32b41290'),  // massage / relaxation
    ],
    cards: [
      card('1515377905703-c4788e51af15'),  // nail art
      card('1516975080664-ed2fc6a32937'),  // facial treatment
      card('1507652313519-a3c4e0d33be7'),  // skincare products
      card('1487412938774-c1b7fa63a82f'),  // beauty products
    ],
    portraits: [
      portrait('1559839734-2b71ea197ec2'),     // esthetician
      portrait('1573496359142-b8d87734a5a2'),  // beauty therapist
      portrait('1580489944761-15a19d654956'),  // salon professional
    ],
  },

  pet: {
    category: 'PET CARE / VETERINARY / GROOMING',
    hero: [
      hero('1587300003388-59208cc962cb'),  // dog being groomed
      hero('1548199973-03cce0bbc87b'),     // dogs together
      hero('1583511655826-05700d52f4d1'),  // vet with pet
    ],
    cards: [
      card('1552053831-71594a27632d'),     // cute cat
      card('1450778869180-41d0601e046e'),  // puppies
      card('1587300003388-59208cc962cb'),  // pet grooming
      card('1548534573-0d0598f90c53'),     // vet examination
    ],
    portraits: [
      portrait('1548534573-0d0598f90c53'),     // veterinarian
      portrait('1559839734-2b71ea197ec2'),     // vet technician
      portrait('1507003211169-0a1dd7228f2d'),  // pet groomer
    ],
  },

  hotel: {
    category: 'HOTEL / RESORT / ACCOMMODATION',
    hero: [
      hero('1566073771259-470c8f1fce56'),  // hotel lobby
      hero('1564501049412-61c2a3083791'),  // hotel exterior
      hero('1540541338537-3cfef9d49b3c'),  // pool and terrace
    ],
    cards: [
      card('1631049307264-da0ec9d70304'),  // luxury hotel room
      card('1551882547-6a3b2f7b4ab4'),     // restaurant in hotel
      card('1540541338537-3cfef9d49b3c'),  // hotel pool
      card('1564501049412-61c2a3083791'),  // hotel exterior
    ],
    portraits: [
      portrait('1571606614736-3d5ca7ce7cb5'),  // hotel staff (male)
      portrait('1573496359142-b8d87734a5a2'),  // concierge (female)
      portrait('1559839734-2b71ea197ec2'),     // manager
    ],
  },

  auto: {
    category: 'CAR DEALERSHIP / AUTO REPAIR',
    hero: [
      hero('1552519507-da3b142831ab'),  // car showroom
      hero('1583121274602-3e2820c69888'),  // auto repair shop
      hero('1618843986316-5abf53a4a2e8'),  // luxury car
    ],
    cards: [
      card('1614026480418-bd11fdb9a5b7'),  // sports car
      card('1544636331-9849da657e11'),     // car interior
      card('1511366820374-db428d977ac7'),  // detailing
      card('1486325212027-8081e485255e'),  // car keys / purchase
    ],
    portraits: [
      portrait('1560250097-0b93528c311a'),     // male sales rep
      portrait('1573496359142-b8d87734a5a2'),  // female dealer
      portrait('1571600128813-3a7d58e3ca8b'),  // mechanic
    ],
  },

  yoga_wellness: {
    category: 'YOGA / PILATES / MEDITATION',
    hero: [
      hero('1544367801-2d6ce3f56b99'),  // yoga practice
      hero('1506126613408-eca07ce68773'),  // meditation
      hero('1545205597-3d9d02c29597'),    // yoga studio
    ],
    cards: [
      card('1506126613408-eca07ce68773'),  // mindfulness
      card('1571019614242-c5c5dee9f50b'),  // fitness / wellness
      card('1544367801-2d6ce3f56b99'),    // yoga pose
      card('1519823772989-0b5f4d1e5c7e'), // wellness retreat
    ],
    portraits: [
      portrait('1559839734-2b71ea197ec2'),     // yoga teacher (female)
      portrait('1573496359142-b8d87734a5a2'),  // instructor
      portrait('1507003211169-0a1dd7228f2d'),  // wellness coach
    ],
  },

  education: {
    category: 'EDUCATION / TUTORING / SCHOOL',
    hero: [
      hero('1503676260728-1c00da094a0b'),  // students learning
      hero('1523050854058-8df90110c9f1'),  // classroom
      hero('1427504494785-3a9ca7044f45'),  // books / study
    ],
    cards: [
      card('1509062522246-51e0ba1c0575'),  // group study
      card('1517048676732-d65bc937f952'),  // students collaborating
      card('1580582932707-520aed937b7b'),  // tutoring session
      card('1456513080510-7bf3a84b82f8'),  // library / reading
    ],
    portraits: [
      portrait('1607990283144-0097c51a2aa8'),  // teacher
      portrait('1573496359142-b8d87734a5a2'),  // educator (female)
      portrait('1519085360753-af0119f7cbe7'),  // professor
    ],
  },

  landscaping: {
    category: 'LANDSCAPING / GARDEN / OUTDOOR',
    hero: [
      hero('1416879595882-3373a0480b5b'),  // beautiful garden
      hero('1558618666-fcd25c85cd64'),     // landscaped yard
      hero('1463936575158-d1265ac4dc93'),  // lawn / outdoor
    ],
    cards: [
      card('1416879595882-3373a0480b5b'),  // garden
      card('1558618666-fcd25c85cd64'),     // landscaping
      card('1473188879741-129346f5ee9e'),  // planting
      card('1598902108854-10b51be28d3c'),  // garden design
    ],
    portraits: [
      portrait('1571600128813-3a7d58e3ca8b'),  // landscaper (male)
      portrait('1559839734-2b71ea197ec2'),     // gardener (female)
      portrait('1507003211169-0a1dd7228f2d'),  // landscape architect
    ],
  },

  interior_design: {
    category: 'INTERIOR DESIGN / ARCHITECTURE',
    hero: [
      hero('1555041469-a586c61ea9bc'),   // beautiful interior
      hero('1519710164239-da123a736b3e'), // modern living room
      hero('1565182999561-18d7dc61c393'), // minimalist design
    ],
    cards: [
      card('1555041469-a586c61ea9bc'),   // interior
      card('1556909114-f6e7ad7d3136'),   // design concept
      card('1484101403633-562f891dc89a'), // home decor
      card('1494438639946-1ebd1d20bf85'), // architecture
    ],
    portraits: [
      portrait('1573496359142-b8d87734a5a2'),  // interior designer (female)
      portrait('1560250097-0b93528c311a'),     // architect (male)
      portrait('1519085360753-af0119f7cbe7'),  // design principal
    ],
  },

  consulting: {
    category: 'CONSULTING / BUSINESS SERVICES',
    hero: [
      hero('1542744173-8e7e53415bb0'),  // business meeting
      hero('1521791136064-7986c2920216'),  // office environment
      hero('1551288049-bebda4e38f71'),    // analytics / strategy
    ],
    cards: [
      card('1554224155-6726b3ff858f'),  // finance charts
      card('1551288049-bebda4e38f71'),  // data analytics
      card('1507209996422-a1937a4a3b8e'),  // strategy documents
      card('1454165804606-c3d57bc86b40'),  // planning
    ],
    portraits: [
      portrait('1560250097-0b93528c311a'),     // male consultant
      portrait('1573496359142-b8d87734a5a2'),  // female consultant
      portrait('1519085360753-af0119f7cbe7'),  // executive
    ],
  },

  ecommerce: {
    category: 'E-COMMERCE / ONLINE STORE',
    hero: [
      hero('1556742049-0cfed4f6a45d'),  // shopping / commerce
      hero('1483985988355-763728e1feb0'),  // product display
      hero('1445205170230-053b83016050'),  // retail store
    ],
    cards: [
      card('1542291026-7eec264c27ff'),  // product shot
      card('1523381294911-8d3cead13475'),  // bag / accessories
      card('1581044777550-4cfa2bce5af6'),  // lifestyle product
      card('1586717791821-3f44a563fa4c'),  // packaging
    ],
    portraits: [
      portrait('1573496359142-b8d87734a5a2'),  // brand owner (female)
      portrait('1560250097-0b93528c311a'),     // entrepreneur (male)
      portrait('1580489944761-15a19d654956'),  // creative director
    ],
  },

  nonprofit: {
    category: 'NONPROFIT / CHARITY / COMMUNITY',
    hero: [
      hero('1593113598498-c79c69f6f9cf'),  // volunteers together
      hero('1488521787-7b0799c6a91d'),     // community event
      hero('1531206715172-0b41291a09e0'),  // charity work
    ],
    cards: [
      card('1593113598498-c79c69f6f9cf'),  // volunteering
      card('1488521787-7b0799c6a91d'),     // community
      card('1531206715172-0b41291a09e0'),  // helping hands
      card('1532629345422-7515f3d16bb6'),  // donation / giving
    ],
    portraits: [
      portrait('1559839734-2b71ea197ec2'),     // volunteer (female)
      portrait('1507003211169-0a1dd7228f2d'),  // volunteer (male)
      portrait('1573496359142-b8d87734a5a2'),  // director
    ],
  },

  music: {
    category: 'MUSIC / ENTERTAINMENT',
    hero: [
      hero('1493225457124-a3eb161ffa5f'),  // live performance
      hero('1511379938547-c1f69419868d'),  // guitar / instruments
      hero('1516924962500-2b4b3b99ea02'),  // concert stage
    ],
    cards: [
      card('1511379938547-c1f69419868d'),  // guitar
      card('1508964942454-1a56651d54ac'),  // recording studio
      card('1516924962500-2b4b3b99ea02'),  // concert
      card('1493225457124-a3eb161ffa5f'),  // band performance
    ],
    portraits: [
      portrait('1507003211169-0a1dd7228f2d'),  // musician (male)
      portrait('1573496359142-b8d87734a5a2'),  // musician (female)
      portrait('1519085360753-af0119f7cbe7'),  // music producer
    ],
  },
}

// ── Category detection ────────────────────────────────────────────────────────

const KEYWORDS: Record<string, string[]> = {
  barbershop:       ['barber', 'barbershop', 'haircut', 'hair salon', 'hair cut', 'hairdresser', 'grooming salon', 'fade', 'taper', 'lineup', 'shave'],
  restaurant:       ['restaurant', 'dining', 'bistro', 'eatery', 'diner', 'tavern', 'brasserie', 'steakhouse', 'sushi bar', 'thai food', 'italian food', 'cuisine', 'fine dining'],
  cafe_bakery:      ['cafe', 'coffee shop', 'bakery', 'bakehouse', 'pastry', 'espresso', 'coffee bar', 'patisserie', 'roastery', 'bake', 'brunch spot', 'cake', 'cakes', 'cupcake', 'cupcakes', 'wedding cake', 'custom cake', 'birthday cake', 'cake shop', 'cake studio', 'bakeshop', 'dessert shop', 'confectionery', 'sweet shop', 'brownie', 'muffin', 'donut', 'doughnut'],
  gym_fitness:      ['gym', 'fitness', 'crossfit', 'weightlifting', 'bodybuilding', 'personal trainer', 'workout', 'health club', 'exercise', 'athletic'],
  medical:          ['medical', 'clinic', 'hospital', 'doctor', 'physician', 'dentist', 'dental', 'pharmacy', 'healthcare', 'health care', 'therapist', 'optometrist', 'chiropractic', 'pediatric'],
  law_firm:         ['law firm', 'legal', 'attorney', 'lawyer', 'solicitor', 'barrister', 'law office', 'counsel', 'litigation', 'legal services'],
  real_estate:      ['real estate', 'property', 'realtor', 'realty', 'homes for sale', 'house listing', 'apartments', 'mortgage', 'housing', 'property management'],
  photography:      ['photographer', 'photography', 'photo studio', 'portrait studio', 'wedding photographer', 'commercial photography', 'photoshoot'],
  wedding_events:   ['wedding', 'bridal', 'wedding planner', 'event planner', 'reception', 'ceremony', 'wedding venue', 'event management'],
  tech_startup:     ['startup', 'saas', 'software', 'tech company', 'technology platform', 'developer tools', 'cloud platform', 'app company', 'software company'],
  fashion:          ['fashion', 'boutique', 'clothing store', 'apparel', 'wardrobe', 'designer clothing', 'streetwear', 'fashion brand'],
  beauty_spa:       ['spa', 'beauty salon', 'nail salon', 'massage', 'skincare', 'esthetics', 'facial', 'waxing', 'beauty treatment', 'medi spa', 'beauty studio'],
  pet:              ['pet', 'veterinary', 'vet clinic', 'animal hospital', 'dog grooming', 'cat care', 'pet care', 'kennel', 'pet store', 'pet boarding'],
  hotel:            ['hotel', 'resort', 'motel', 'inn', 'bed and breakfast', 'b&b', 'hospitality', 'accommodation', 'lodge', 'boutique hotel'],
  auto:             ['car dealership', 'auto repair', 'mechanic', 'garage', 'auto shop', 'car wash', 'tire shop', 'auto detailing', 'vehicle', 'car dealer', 'auto service'],
  yoga_wellness:    ['yoga', 'pilates', 'meditation', 'mindfulness', 'wellness center', 'holistic', 'retreat', 'spiritual', 'healing center'],
  education:        ['school', 'education', 'tutoring', 'academy', 'learning center', 'university', 'college', 'training center', 'online courses', 'e-learning'],
  landscaping:      ['landscape', 'landscaping', 'garden', 'lawn care', 'outdoor services', 'horticulture', 'gardening', 'tree service', 'nursery', 'lawn service'],
  interior_design:  ['interior design', 'interior decorator', 'home decor', 'furniture store', 'home renovation', 'architect', 'architecture firm', 'home staging'],
  consulting:       ['consulting', 'consultant', 'advisory', 'management consulting', 'business services', 'financial consulting', 'accounting', 'cpa firm', 'strategy firm'],
  ecommerce:        ['online store', 'ecommerce', 'e-commerce', 'marketplace', 'retail store', 'shop online', 'products store', 'merchandise'],
  nonprofit:        ['nonprofit', 'charity', 'foundation', 'ngo', 'volunteer', 'donation', 'fundraising', 'community organization', 'not for profit'],
  music:            ['music', 'band', 'musician', 'recording studio', 'concert', 'entertainment', 'dj services', 'music artist', 'music school'],
}

/**
 * Detects the best-matching image category from the user's prompt.
 * Returns a key into LIBRARY, or null if no confident match is found.
 */
export function detectImageCategory(prompt: string): string | null {
  const lower = prompt.toLowerCase()
  let bestKey: string | null = null
  let bestScore = 0

  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Multi-word keywords are more specific — weight them higher
        score += kw.includes(' ') ? 3 : 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  // Only return a match if at least one keyword matched
  return bestScore > 0 ? bestKey : null
}

/**
 * Returns a formatted prompt block that instructs the AI to use topic-specific
 * Unsplash images instead of generic picsum.photos seeds.
 *
 * Returns null if the prompt doesn't match any known category, in which case
 * the standard picsum instructions in the system prompt apply.
 */
export function getImagePaletteBlock(userPrompt: string): string | null {
  const key = detectImageCategory(userPrompt)
  if (!key) return null

  const palette = LIBRARY[key]
  if (!palette) return null

  return `
━━━ SITE-SPECIFIC IMAGE PALETTE (${palette.category}) ━━━
Use THESE exact Unsplash URLs for all images — do NOT use picsum.photos for this project.
These photos match the actual subject matter of the site being built.

HERO / HEADER IMAGES (1200×600 — full-width page headers, hero sections):
${palette.hero.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}

CARD / SECTION IMAGES (600×400 — service cards, feature grids, gallery):
${palette.cards.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}

TEAM / PORTRAIT IMAGES (400×400 — staff profiles, testimonial avatars):
${palette.portraits.map((url, i) => `  ${i + 1}. ${url}`).join('\n')}

⚠️ MANDATORY IMAGE RULES:
- Use images from the list above — do NOT invent picsum URLs
- Vary them across the page (use hero #1 for main banner, hero #2 for about section, etc.)
- Every <img> must have a descriptive alt attribute matching the image content
- Add loading="lazy" to all images below the fold
`.trim()
}
