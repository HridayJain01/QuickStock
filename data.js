// QuickStock static data: companies, sectors, news, businesses, events.
// All companies are fictional.

const SECTORS = {
  tech:    { name: 'Tech / IT',      em: '💻' },
  bank:    { name: 'Banking',        em: '🏦' },
  pharma:  { name: 'Pharma',         em: '💊' },
  energy:  { name: 'Energy / Oil',   em: '🛢️' },
  auto:    { name: 'Auto / EV',      em: '🚗' },
  fmcg:    { name: 'FMCG / Retail',  em: '🛒' },
  telecom: { name: 'Telecom',        em: '📶' },
  infra:   { name: 'Infra / Realty', em: '🏗️' },
  travel:  { name: 'Travel',         em: '✈️' },
  media:   { name: 'Media / Sports', em: '🎬' },
  crypto:  { name: 'Crypto / Fintech', em: '🪙' },
  metals:  { name: 'Metals / Mining', em: '⛏️' },
};

const COUNTRIES = {
  IN: ['🇮🇳', 'India', 'IN'], US: ['🇺🇸', 'USA', 'US'], DE: ['🇩🇪', 'Germany', 'EU'], CH: ['🇨🇭', 'Switzerland', 'EU'],
  FR: ['🇫🇷', 'France', 'EU'], GB: ['🇬🇧', 'UK', 'EU'], NL: ['🇳🇱', 'Netherlands', 'EU'], DK: ['🇩🇰', 'Denmark', 'EU'],
  SE: ['🇸🇪', 'Sweden', 'EU'], JP: ['🇯🇵', 'Japan', 'ASIA'], CN: ['🇨🇳', 'China', 'ASIA'], KR: ['🇰🇷', 'Korea', 'ASIA'],
  TW: ['🇹🇼', 'Taiwan', 'ASIA'], SG: ['🇸🇬', 'Singapore', 'ASIA'], SA: ['🇸🇦', 'Saudi Arabia', 'WORLD'],
  AE: ['🇦🇪', 'UAE', 'WORLD'], AU: ['🇦🇺', 'Australia', 'WORLD'], BR: ['🇧🇷', 'Brazil', 'WORLD'],
  CA: ['🇨🇦', 'Canada', 'WORLD'], ZA: ['🇿🇦', 'South Africa', 'WORLD'], NG: ['🇳🇬', 'Nigeria', 'WORLD'],
};
const REGIONS = { IN: '🇮🇳 India', US: '🇺🇸 USA', EU: '🇪🇺 Europe', ASIA: '🌏 Asia', WORLD: '🌍 Rest of World' };

// SYM|Name|Country|sector|emoji|price ₹|volatility|description
const COMPANY_LINES = `
INFSP|Infosphere Tech|IN|tech|💻|1520|0.8|Bengaluru IT services giant with 3 lakh coders and infinite Excel sheets
TATVA|Tatva Consultancy|IN|tech|🧠|3400|0.7|India's most boring and most reliable software exporter
VIPRA|Vipra Digital|IN|tech|🖥️|480|0.9|Mid-size IT firm that rebrands to whatever is trending
JUGAAD|Jugaad AI Labs|IN|tech|🤖|72|3.2|Hot AI startup. Nobody knows what it does, everybody wants it
BHARATBK|Bharat National Bank|IN|bank|🏦|780|0.7|Largest private bank, branch in every gali
SUVIDHA|Suvidha Bank|IN|bank|🏛️|1650|0.8|Premium bank for people who own two cars
JANBK|Jan Dhan Small Finance|IN|bank|🪙|95|1.6|Micro-loans for small towns; high growth, high risk
LAKSHMI|Lakshmi Housing Finance|IN|bank|🏘️|410|1.2|Home loans for the middle class dream
BIMA|Jeevan Bima Corp|IN|bank|🛡️|950|0.6|Insurance titan. Your dad's favourite stock
SANJEEVNI|Sanjeevani Pharma|IN|pharma|💊|1180|1.1|Generic medicines exported to 80 countries
AYUR|AyurVeda Naturals|IN|pharma|🌿|260|1.4|Herbal everything, from toothpaste to immunity shots
DRMEHTA|Dr. Mehta Labs|IN|pharma|🧪|5200|1.0|Research-heavy drugmaker with a big US pipeline
BHVAC|Bharat Vaccines|IN|pharma|💉|640|1.7|Makes vaccines. Spikes whenever someone sneezes on TV
BHPET|Bharat Petrochem|IN|energy|🛢️|920|1.0|Oil-to-chemicals conglomerate, India's energy backbone
SURYA|Surya Solar Power|IN|energy|☀️|145|2.0|Solar farms in Rajasthan; loves government subsidies
GRIDX|Rashtriya Power Grid|IN|energy|⚡|310|0.6|State power utility. Slow, steady, pays dividends
SAWARI|Sawari Motors|IN|auto|🚗|10400|0.8|Every second car on Indian roads is a Sawari
BAJRANG|Bajrang Two-Wheelers|IN|auto|🏍️|7800|0.9|Bikes that survive potholes, floods and teenagers
ELECTRA|Electra EV|IN|auto|🔋|88|2.8|Electric scooters with big dreams and occasional fires
CHAI|ChaiChain Ltd|IN|fmcg|🍵|340|1.2|10,000 chai outlets. Cutting chai at scale
BISKUT|Desi Biskut Co|IN|fmcg|🍪|2400|0.6|The biscuit you dipped in chai as a kid
KHAANA|Khaana Express|IN|fmcg|🍛|165|2.1|Food delivery app burning cash at 30 minutes or less
MASALA|Masala Kings|IN|fmcg|🌶️|720|0.9|Spices in every Indian kitchen and NRI suitcase
DOODH|Doodh Sahakari Dairy|IN|fmcg|🥛|540|0.7|Milk cooperative turned dairy giant
KIRANA|Kirana Mart|IN|fmcg|🛒|4100|1.0|Discount supermarket chain loved by aunties everywhere
JAIHO|JaiHo Telecom|IN|telecom|📶|1250|0.9|Cheap data that turned India into reel-watchers
VAYU|Vayu Mobile|IN|telecom|📱|1480|0.8|Premium telecom, always fighting JaiHo
SASTA|SastaNet Broadband|IN|telecom|🌐|18|3.0|Penny stock telecom with 9 lakh crore of debt
NIRMAN|Nirman Infra|IN|infra|🏗️|3500|0.9|Builds metros, bridges and dreams
GHAR|Sapna Ghar Realty|IN|infra|🏠|780|1.5|Luxury flats "possession in 2 years" (since 2014)
SAMUDRA|Samudra Ports|IN|infra|⚓|1350|1.6|Ports, airports, everything-ports
PAKKA|Pakka Cement|IN|infra|🧱|9800|0.8|Cement so strong the ads have elephants on it
UDAAN|Udaan Airways|IN|travel|✈️|4200|1.5|India's biggest airline. Always on time-ish
RAILX|Rail Yatra Corp|IN|travel|🚆|780|1.0|Train tickets and tatkal panic, digitised
GOAHOT|Goa Coast Hotels|IN|travel|🏨|420|1.3|Beach resorts for Dil Chahta Hai road trips
BOLLY|Bollywood Dreams|IN|media|🎬|210|2.2|Film studio. One hit pays for ten flops
SIXER|Sixer Sports League|IN|media|🏏|1100|1.8|Owns cricket teams and broadcast rights
KHABAR|Khabar24 News|IN|media|📺|95|1.4|Breaking news every 4 minutes, all in CAPS
SURTAAL|SurTaal Music|IN|media|🎵|480|1.3|Music label with every 90s song you love
BHCOIN|BharatCoin Exchange|IN|crypto|🪙|55|3.5|Desi crypto exchange. Regulators hate this one trick
PAISA|PaisaPe UPI|IN|crypto|📲|890|1.8|UPI payments app, "scan karo, pay karo"
LOHA|Loha Steel|IN|metals|🔩|140|1.3|Steel for all the buildings Nirman builds
SONA|Sona Gold Refinery|IN|metals|🥇|2900|0.9|Gold refinery; shines brightest when markets fear
KOYLA|Koyla Mines|IN|metals|⛏️|420|1.0|State coal miner. Dirty, profitable, dividend-y
TAMBA|Tamba Copper|IN|metals|🟠|260|1.4|Copper for wires, EVs and temple bells
NIMBUS|Nimbus Cloud|US|tech|☁️|28000|1.1|Seattle cloud giant renting computers to the planet
PEAR|Pear Inc|US|tech|🍐|19000|0.9|Makes very expensive phones in very nice boxes
MACRO|Macrohard Systems|US|tech|🪟|34000|0.8|Your office software and your gaming console
GOOBLE|Gooble Search|US|tech|🔍|14000|1.0|Knows what you searched at 2 AM
FACEPL|Faceplace Social|US|tech|👍|42000|1.3|Social media empire, now also building the metaverse
NVIDEO|Nvideo Chips|US|tech|🎮|11000|2.0|AI chips. The shovel seller in the AI gold rush
ROCKT|Rocketeer Space|US|tech|🚀|4500|2.8|Reusable rockets and big promises about Mars
PALANT|Palantear Data|US|tech|👁️|2100|2.5|Big data for governments. Retail investors love it
VOLTA|Volta Motors|US|auto|⚡|21000|2.6|EV maker whose CEO tweets move the stock
DETROIT|Detroit Auto Works|US|auto|🚙|1100|1.1|Old-school carmaker learning electric tricks
JPMONEY|JP Moneybags|US|bank|💰|17000|0.9|The biggest bank on Wall Street
GOLDSK|Goldsack Partners|US|bank|💼|38000|1.1|Investment bankers in very expensive vests
OMAHA|Omaha Holdings|US|bank|🧓|39000|0.4|Run by a 94-year-old who drinks cola and never sells
AMAZIN|Amazin Prime|US|fmcg|📦|15000|1.1|Delivers anything, anywhere, by tomorrow
FIZZ|Fizz Cola|US|fmcg|🥤|5200|0.5|Sugar water with 130 years of brand power
BURGR|Burger Planet|US|fmcg|🍔|24000|0.6|Golden arches-ish fast food everywhere
MEGAMRT|MegaMart Stores|US|fmcg|🏬|7000|0.5|Giant discount stores. Recession-proof-ish
PFIZZY|Pfizzy Biotech|US|pharma|🧬|2400|1.3|Big pharma with a fizzy name
MRNAX|mRNA Futures|US|pharma|🔬|8500|2.4|Gene-tech biotech. Trial results = coin flips
EXXOFF|Exxoff Oil|US|energy|⛽|9500|0.9|Texas oil major. Loves high crude prices
BOING|Boing Aerospace|US|travel|🛫|16000|1.6|Plane maker. Doors stay on, usually
RIDEZ|Ridez Mobility|US|travel|🚕|6000|1.5|Ride-hailing app, now profitable (allegedly)
MOUSE|Magic Mouse Studios|US|media|🏰|8800|1.1|Theme parks, princesses and superhero movies
BINGE|Bingeflix|US|media|🍿|52000|1.6|Streaming giant: 'Are you still watching?'
STONKS|Stonks Retail|US|media|🦍|1800|4.0|Meme stock. Apes together strong. Pure chaos
COINHUT|CoinHut Exchange|US|crypto|₿|18000|3.2|America's crypto exchange; moves with Bitcoin
SWIPE|Swipe Payments|US|crypto|💳|23000|0.8|Card network taking a cut of every coffee
BELLTEL|BellTel Wireless|US|telecom|☎️|1500|0.6|US telecom. Boring, dividend, 5G towers
SKYLINE|Skyline REIT|US|infra|🌆|3200|0.8|Owns office towers in Manhattan and Chicago
AZCOPR|Arizona Copper|US|metals|🪨|3800|1.4|Copper and gold mines in the desert
FOLKWG|Folkwagen AG|DE|auto|🚐|9500|1.0|German people's car, now electric
BAVAR|Bavarian Motorwerke|DE|auto|🏎️|8000|0.9|Luxury sedans for CEOs and Punjabi weddings
ZIEMEN|Ziemens Industrie|DE|infra|⚙️|15000|0.8|Trains, turbines, factories: German engineering
SAPPY|Sappy Software|DE|tech|📊|17000|0.9|Enterprise software nobody likes but everyone uses
NESTLY|Nestly Foods|CH|fmcg|🍫|8500|0.5|Chocolate, coffee and two-minute noodles
ALPHRM|AlpenPharma|CH|pharma|🏔️|24000|0.7|Swiss pharma: precise, expensive, profitable
LUXE|Luxe Maison|FR|fmcg|👜|62000|1.0|Luxury handbags that cost more than cars
TOTALE|TotalÉnergie|FR|energy|🔥|5300|0.9|French oil and renewables major
EUROJET|EuroJet Aero|FR|travel|🛩️|14000|1.2|European plane maker, Boing's arch rival
LONBK|London Crown Bank|GB|bank|👑|720|0.9|British bank with deep roots in Asia
BRITOIL|North Sea Oil plc|GB|energy|🌊|500|1.0|Oil from cold, angry seas
LITHO|Dutch Litho Machines|NL|tech|🔭|75000|1.4|Only company that builds chip-making machines
NORDIC|Nordic Slim Pharma|DK|pharma|💉|9000|1.5|Weight-loss jab maker. Hollywood's favourite
BEATBX|Beatbox Streaming|SE|media|🎧|28000|1.4|Music streaming with wrapped playlists
FLATPK|FlatPak Furniture|SE|infra|🪑|1600|0.7|Furniture you build yourself, with one leftover screw
KYOTO|Kyoto Robotics|JP|tech|🦾|6500|1.3|Factory robots and cute humanoids
TOYODA|Toyoda Motors|JP|auto|🚘|1700|0.7|World's most reliable cars
SONIC|Sonic Electronics|JP|tech|🎮|1800|1.0|Cameras, consoles and sensors
NINJA|Ninja Games|JP|media|🕹️|4800|1.2|Video game legend with a moustached plumber-ish hero
SHINK|Shinkansen Rail|JP|travel|🚄|2600|0.6|Bullet trains, never late
DRAGON|Dragon Ecommerce|CN|fmcg|🐉|7200|2.0|China's biggest online bazaar
PANDA|Panda Battery|CN|auto|🐼|17000|1.8|Makes batteries for half the world's EVs
TENSEN|Tensen Social|CN|tech|💬|30000|1.5|Super-app for chat, games and payments
GRTWALL|Great Wall Steel|CN|metals|🧱|300|1.4|World's biggest steel mill
BYTESN|ByteSnack Video|CN|media|🎞️|9000|2.2|Short videos that eat your evenings
SAMSONG|Samsong Electronics|KR|tech|📺|5600|1.0|Phones, TVs, chips and fridges
KPOP|K-Pop Star Ent.|KR|media|🎤|3300|2.0|Idol factory. A breakup tanks the stock
HYUNDY|Hyunday Motors|KR|auto|🚗|17000|1.0|Korean cars, very big in India
FORMOSA|Formosa Fab Semi|TW|tech|🔬|14000|1.2|Makes the chips inside everything
LIONAIR|Lion City Airlines|SG|travel|🛬|450|1.1|Award-winning airline with great food
DESERT|Desert Crude Co|SA|energy|🐪|650|0.6|World's biggest oil company
BURJ|Burj Realty|AE|infra|🏙️|420|1.3|Builds the tallest towers in the desert
OUTBACK|Outback Mining|AU|metals|🦘|3900|1.1|Iron ore and lithium from Down Under
AMAZNA|Amazonia Iron|BR|metals|🌳|1100|1.5|Brazilian iron ore heavyweight
MAPLE|Maple Shopworks|CA|tech|🍁|6500|1.8|Online store builder for small sellers
SAFARI|Safari Telecom|ZA|telecom|🦁|1200|1.2|Mobile network across 20 African countries
LAGOS|Lagos Fintech|NG|crypto|🌍|240|2.6|Africa's fastest-growing payments startup
`;

const SECTOR_PE = { tech: 30, bank: 14, pharma: 25, energy: 10, auto: 18, fmcg: 45, telecom: 20, infra: 22, travel: 28, media: 35, crypto: 60, metals: 8 };
const SECTOR_BETA = { tech: 1.2, bank: 1.0, pharma: 0.6, energy: 0.8, auto: 1.1, fmcg: 0.5, telecom: 0.7, infra: 1.2, travel: 1.3, media: 1.1, crypto: 2.0, metals: 1.1 };

const CEO_NAMES = {
  IN: [['Rajesh', 'Priya', 'Vikram', 'Sunita', 'Arjun', 'Kavita', 'Rohan', 'Meera', 'Suresh', 'Deepika', 'Harsh', 'Ananya', 'Mukesh', 'Lalita'],
       ['Mehta', 'Sharma', 'Iyer', 'Reddy', 'Gupta', 'Shah', 'Nair', 'Kapoor', 'Agarwal', 'Banerjee', 'Singh', 'Patel', 'Rao', 'Joshi']],
  WEST: [['John', 'Sarah', 'Mike', 'Emily', 'Chad', 'Karen', 'Brad', 'Jessica', 'Greg', 'Hans', 'Sophie', 'Pierre', 'Lars', 'Olivia'],
         ['Smith', 'Miller', 'Johnson', 'Becker', 'Dubois', 'Larsen', 'Brown', 'Walker', 'Fischer', 'Clarke', 'Rossi', 'Moreau']],
  EAST: [['Kenji', 'Yuki', 'Wei', 'Li', 'Min-jun', 'Ji-woo', 'Hiro', 'Mei', 'Jun', 'Sakura'],
         ['Tanaka', 'Sato', 'Wang', 'Zhang', 'Kim', 'Park', 'Chen', 'Lee', 'Watanabe', 'Liu']],
};

// Sources: rel = chance a headline is true, mag = impact multiplier
const SOURCES = {
  govt:   { em: '🏛️', name: 'Official', rel: 1.0, mag: 1.0 },
  earn:   { em: '📊', name: 'Earnings', rel: 1.0, mag: 1.0 },
  paper:  { em: '📰', name: 'Newspaper', rel: 0.85, mag: 1.0 },
  tv:     { em: '📺', name: 'TV Anchor', rel: 0.7, mag: 1.2 },
  social: { em: '🐦', name: 'Social Media', rel: 0.45, mag: 1.8 },
  wa:     { em: '💬', name: 'WhatsApp Uncle', rel: 0.3, mag: 2.3 },
  tip:    { em: '🕵️', name: 'Bhai ka tip', rel: 1.0, mag: 1.0 },
};

// News templates: t = text, fx = [[scope, key, minImpact, maxImpact]], src = possible sources.
// scope: c = random company (key '*' or sector), s = sector, r = region, rs = 'REGION:sector', m = whole market.
// {c} company, {c2} other company, {ceo} CEO, {n} number.
const NEWS = [
  // --- company good ---
  { t: '{c} bags ₹{n} Cr government order', fx: [['c', '*', 4, 10]], src: ['paper', 'govt'] },
  { t: '{c} announces 1:1 bonus issue and buyback', fx: [['c', '*', 5, 12]], src: ['paper'] },
  { t: '{c} signs mega partnership with {c2}', fx: [['c', '*', 3, 9]], src: ['paper', 'tv'] },
  { t: 'Rumour: {c2} in talks to acquire {c} at 35% premium 👀', fx: [['c', '*', 10, 25]], src: ['social', 'wa'] },
  { t: '{c} CEO {ceo} spotted with Finance Minister. Big news soon?', fx: [['c', '*', 6, 15]], src: ['wa', 'social'] },
  { t: 'FIIs pile into {c}: ₹{n} Cr block deal', fx: [['c', '*', 3, 8]], src: ['paper'] },
  { t: '{c} launches AI-powered everything. Stock goes brrr', fx: [['c', '*', 5, 14]], src: ['social', 'tv'] },
  { t: 'Big Bull adds {c} to his portfolio', fx: [['c', '*', 6, 15]], src: ['tv', 'social'] },
  { t: 'Goldsack upgrades {c} to STRONG BUY 🚀', fx: [['c', '*', 3, 8]], src: ['tv', 'paper'] },
  { t: '{c} wins patent war against {c2}', fx: [['c', '*', 4, 10]], src: ['paper'] },
  { t: '{c} to be added to benchmark index', fx: [['c', '*', 3, 7]], src: ['paper'] },
  { t: '{c} product goes viral on Insta reels 🔥', fx: [['c', '*', 4, 12]], src: ['social'] },
  { t: '{c} becomes debt-free, promoters celebrate', fx: [['c', '*', 3, 7]], src: ['paper'] },
  { t: '{c} expands into 40 new countries', fx: [['c', '*', 3, 8]], src: ['paper', 'tv'] },
  { t: '{c} insiders buying shares quietly, says filing', fx: [['c', '*', 3, 9]], src: ['paper'] },
  { t: 'Reddit apes discover {c}. To the moon? 🦍', fx: [['c', '*', 8, 30]], src: ['social'] },
  { t: '{c} hikes dividend by {n}%', fx: [['c', '*', 2, 6]], src: ['paper'] },
  { t: '{c} beats {c2} to win ₹{n} Cr export contract', fx: [['c', '*', 4, 9]], src: ['paper', 'tv'] },
  // --- company bad ---
  { t: 'Income tax raid at {c} offices 🚨', fx: [['c', '*', -15, -6]], src: ['tv', 'paper'] },
  { t: '{c} CEO {ceo} resigns suddenly', fx: [['c', '*', -12, -5]], src: ['paper', 'tv'] },
  { t: 'Short-seller report calls {c} "a house of cards"', fx: [['c', '*', -25, -10]], src: ['social', 'paper'] },
  { t: 'Fire at {c} factory halts production', fx: [['c', '*', -10, -4]], src: ['paper', 'tv'] },
  { t: 'SEBI probes {c} for insider trading', fx: [['c', '*', -14, -6]], src: ['govt', 'paper'] },
  { t: '{c} loses key contract to {c2}', fx: [['c', '*', -9, -3]], src: ['paper'] },
  { t: '{c} recalls 2 lakh units over safety defect', fx: [['c', '*', -10, -4]], src: ['paper'] },
  { t: 'Data breach at {c}: crores of users hit', fx: [['c', '*', -12, -4]], src: ['tv', 'paper'] },
  { t: '{c} downgraded to SELL, target cut 30%', fx: [['c', '*', -8, -3]], src: ['tv', 'paper'] },
  { t: 'Promoters pledge more {c} shares', fx: [['c', '*', -9, -3]], src: ['paper'] },
  { t: 'WhatsApp forward claims {c} is going bankrupt 😱', fx: [['c', '*', -20, -8]], src: ['wa'] },
  { t: '{c} delays results, auditor resigns', fx: [['c', '*', -18, -8]], src: ['paper'] },
  { t: '{c} app crashes for 12 hours, users furious', fx: [['c', '*', -7, -2]], src: ['social'] },
  { t: 'Viral video shows {c} product exploding 💥', fx: [['c', '*', -13, -4]], src: ['social', 'wa'] },
  { t: '{c} CEO {ceo} posts something unhinged at 3 AM', fx: [['c', '*', -9, 9]], src: ['social'] },
  { t: '{c} hit with ₹{n} Cr penalty by regulator', fx: [['c', '*', -9, -3]], src: ['govt', 'paper'] },
  { t: 'Workers strike at {c} plants', fx: [['c', '*', -8, -3]], src: ['paper', 'tv'] },
  // --- sector ---
  { t: 'AI boom! Chip orders explode worldwide 🤖', fx: [['s', 'tech', 4, 9]], src: ['paper', 'tv'] },
  { t: 'Global tech layoffs wave hits Silicon Valley', fx: [['s', 'tech', -5, -2]], src: ['paper'] },
  { t: 'US tightens H-1B visas, Indian IT jittery', fx: [['rs', 'IN:tech', -7, -3]], src: ['govt', 'paper'] },
  { t: 'Rupee weakens; IT exporters cheer 💵', fx: [['rs', 'IN:tech', 2, 5], ['rs', 'IN:travel', -3, -1]], src: ['paper'] },
  { t: 'RBI cuts repo rate by 25 bps 🎉', fx: [['rs', 'IN:bank', 3, 6], ['rs', 'IN:infra', 3, 7], ['rs', 'IN:auto', 2, 4]], src: ['govt'] },
  { t: 'RBI hikes repo rate unexpectedly', fx: [['rs', 'IN:bank', -5, -2], ['rs', 'IN:infra', -7, -3], ['rs', 'IN:auto', -4, -1]], src: ['govt'] },
  { t: 'Bad-loan crisis whispers in small banks', fx: [['rs', 'IN:bank', -8, -3]], src: ['wa', 'paper'] },
  { t: 'Fed raises rates; Wall Street banks rally, tech sinks', fx: [['rs', 'US:bank', 2, 5], ['rs', 'US:tech', -5, -2]], src: ['govt'] },
  { t: 'New virus variant spreading fast 🦠', fx: [['s', 'pharma', 6, 14], ['s', 'travel', -12, -5], ['m', '', -3, -1]], src: ['tv', 'paper'] },
  { t: 'USFDA warning letters to Indian pharma units', fx: [['rs', 'IN:pharma', -8, -3]], src: ['govt'] },
  { t: 'Government caps drug prices', fx: [['s', 'pharma', -5, -2]], src: ['govt'] },
  { t: 'Miracle cancer drug trial succeeds in labs', fx: [['s', 'pharma', 3, 8]], src: ['paper', 'social'] },
  { t: 'OPEC slashes output, crude spikes to $110 🛢️', fx: [['s', 'energy', 5, 10], ['s', 'travel', -8, -3], ['s', 'auto', -5, -2], ['rs', 'IN:fmcg', -3, -1]], src: ['paper', 'govt'] },
  { t: 'Crude crashes below $55', fx: [['s', 'energy', -9, -4], ['s', 'travel', 4, 8], ['s', 'auto', 2, 4]], src: ['paper'] },
  { t: 'Govt announces massive solar subsidy ☀️', fx: [['rs', 'IN:energy', 3, 10]], src: ['govt'] },
  { t: 'EV subsidy extended for 3 more years ⚡', fx: [['s', 'auto', 3, 7]], src: ['govt'] },
  { t: 'Chip shortage hits carmakers again', fx: [['s', 'auto', -7, -3], ['s', 'tech', 2, 4]], src: ['paper'] },
  { t: 'Record Diwali car and bike sales 🪔', fx: [['rs', 'IN:auto', 4, 8], ['rs', 'IN:fmcg', 2, 5]], src: ['paper'] },
  { t: 'IMD forecasts above-normal monsoon 🌧️', fx: [['rs', 'IN:fmcg', 3, 6], ['rs', 'IN:auto', 1, 3]], src: ['govt'] },
  { t: 'Inflation spikes, families cut spending', fx: [['s', 'fmcg', -5, -2], ['m', '', -2, -0.5]], src: ['govt', 'paper'] },
  { t: 'Onion prices triple overnight 🧅', fx: [['rs', 'IN:fmcg', -5, -2]], src: ['tv', 'wa'] },
  { t: 'Telcos hike tariffs by 20% 📶', fx: [['s', 'telecom', 4, 9]], src: ['paper'] },
  { t: 'Spectrum auction goes way over budget', fx: [['s', 'telecom', -7, -3]], src: ['govt', 'paper'] },
  { t: '5G rollout ahead of schedule', fx: [['s', 'telecom', 2, 6]], src: ['paper'] },
  { t: 'Govt unveils ₹10 lakh Cr infrastructure push 🏗️', fx: [['rs', 'IN:infra', 5, 12], ['rs', 'IN:metals', 3, 8]], src: ['govt'] },
  { t: 'Housing sales slump to 5-year low', fx: [['s', 'infra', -6, -2]], src: ['paper'] },
  { t: 'Record summer holiday bookings 🏖️', fx: [['s', 'travel', 4, 9]], src: ['paper', 'tv'] },
  { t: 'Pilots go on strike across airlines', fx: [['s', 'travel', -9, -4]], src: ['tv'] },
  { t: 'IPL media rights fetch record ₹50,000 Cr bid 🏏', fx: [['rs', 'IN:media', 6, 14]], src: ['paper'] },
  { t: 'Box office disaster week: every film flops', fx: [['s', 'media', -6, -2]], src: ['tv'] },
  { t: 'Streaming price war erupts', fx: [['s', 'media', -5, -1]], src: ['paper'] },
  { t: 'Bitcoin smashes all-time high! 🚀₿', fx: [['s', 'crypto', 8, 20]], src: ['social', 'paper'] },
  { t: 'Govt proposes total crypto ban 🚫', fx: [['s', 'crypto', -25, -10]], src: ['wa', 'govt'] },
  { t: 'Major crypto exchange hacked, $600M gone', fx: [['s', 'crypto', -15, -6]], src: ['paper', 'social'] },
  { t: 'Crypto ETF approved by regulators', fx: [['s', 'crypto', 6, 15]], src: ['govt'] },
  { t: 'UPI goes global, 20 countries sign up 📲', fx: [['rs', 'IN:crypto', 4, 10]], src: ['govt'] },
  { t: 'China stimulus: metals boom 🔩', fx: [['s', 'metals', 4, 10], ['r', 'ASIA', 1, 3]], src: ['paper'] },
  { t: 'Gold hits record as fear grips investors 🥇', fx: [['s', 'metals', 2, 6], ['m', '', -2, -0.5]], src: ['paper'] },
  { t: 'Anti-dumping duty on Chinese steel', fx: [['rs', 'IN:metals', 4, 8], ['rs', 'ASIA:metals', -5, -2]], src: ['govt'] },
  { t: 'Lithium discovered in huge quantities in J&K', fx: [['rs', 'IN:metals', 4, 9], ['rs', 'IN:auto', 1, 3]], src: ['govt', 'paper'] },
  { t: 'K-pop mega group announces world tour 🎤', fx: [['rs', 'ASIA:media', 4, 10]], src: ['social'] },
  // --- region / market ---
  { t: 'Sensex hits record high on FII buying 🐂', fx: [['r', 'IN', 2, 4]], src: ['paper', 'tv'] },
  { t: 'Global sell-off as recession fears grip', fx: [['m', '', -4, -1.5]], src: ['paper'] },
  { t: 'Fed chair hints at rate cuts', fx: [['r', 'US', 1.5, 3.5], ['m', '', 0.5, 1.5]], src: ['govt'] },
  { t: 'Exit polls: stable government expected 🗳️', fx: [['r', 'IN', 3, 6]], src: ['tv'] },
  { t: 'Exit polls show hung parliament!', fx: [['r', 'IN', -6, -3]], src: ['tv'] },
  { t: 'China-Taiwan tensions escalate', fx: [['r', 'ASIA', -6, -2], ['s', 'tech', -3, -1]], src: ['paper', 'tv'] },
  { t: 'Europe energy crisis deepens', fx: [['r', 'EU', -5, -1.5]], src: ['paper'] },
  { t: 'US jobs data smashes expectations', fx: [['r', 'US', 1, 3]], src: ['govt'] },
  { t: 'Rupee hits record low vs dollar', fx: [['r', 'IN', -3, -1]], src: ['paper'] },
  { t: 'War rumours spook global markets ⚠️', fx: [['m', '', -5, -2], ['s', 'energy', 2, 6], ['s', 'metals', 2, 4]], src: ['social', 'wa'] },
  { t: 'India GDP growth beats estimates at 8.4% 🇮🇳', fx: [['r', 'IN', 2, 5]], src: ['govt'] },
  { t: 'Middle East peace deal signed 🕊️', fx: [['m', '', 1, 3], ['s', 'energy', -4, -1], ['s', 'travel', 2, 5]], src: ['govt', 'paper'] },
  { t: 'Japan exits negative interest rates', fx: [['r', 'ASIA', -4, -1]], src: ['govt'] },
  { t: 'Retail investors open record 40 lakh demat accounts', fx: [['r', 'IN', 1, 3]], src: ['paper'] },
];

// Scheduled events: announced in advance, resolved on that day with one of the outcomes.
const EVENTS = [
  { a: '🏛️ RBI policy meeting on Day {d}. Rate cut or hike?', o: [
    { t: 'RBI CUTS rates by 50 bps! 🎉', fx: [['r', 'IN', 2, 4], ['rs', 'IN:bank', 3, 6], ['rs', 'IN:infra', 4, 8]] },
    { t: 'RBI HIKES rates by 25 bps 😬', fx: [['r', 'IN', -4, -2], ['rs', 'IN:infra', -6, -3]] },
    { t: 'RBI keeps rates unchanged. Yawn.', fx: [['r', 'IN', -0.5, 0.5]] }] },
  { a: '🏛️ US Fed meeting on Day {d}. Wall Street holds its breath', o: [
    { t: 'Fed CUTS rates! Markets party 🥳', fx: [['m', '', 2, 4], ['s', 'tech', 2, 5], ['s', 'crypto', 4, 10]] },
    { t: 'Fed HIKES rates, says inflation sticky', fx: [['m', '', -4, -2], ['s', 'tech', -5, -2], ['s', 'crypto', -10, -4]] }] },
  { a: '🇮🇳 Union Budget on Day {d}! Who wins?', o: [
    { t: 'Budget: massive infra and capex push 🏗️', fx: [['rs', 'IN:infra', 6, 12], ['rs', 'IN:metals', 4, 8], ['rs', 'IN:bank', 2, 4]] },
    { t: 'Budget: tax cuts for middle class 💸', fx: [['rs', 'IN:fmcg', 5, 10], ['rs', 'IN:auto', 4, 8], ['rs', 'IN:travel', 3, 6]] },
    { t: 'Budget: new capital gains tax on stocks 😡', fx: [['r', 'IN', -6, -3]] },
    { t: 'Budget: 30% tax and 1% TDS on crypto', fx: [['rs', 'IN:crypto', -15, -6]] }] },
  { a: '🗳️ Election results on Day {d}! Biggest event of the year', o: [
    { t: 'Election: clear majority! Markets explode 🚀', fx: [['r', 'IN', 5, 10]] },
    { t: 'Election: coalition chaos, markets tank', fx: [['r', 'IN', -10, -5]] }] },
  { a: '📊 US CPI inflation data on Day {d}', o: [
    { t: 'US inflation cools faster than expected', fx: [['r', 'US', 2, 4], ['m', '', 1, 2]] },
    { t: 'US inflation red hot again 🔥', fx: [['r', 'US', -4, -2], ['m', '', -2, -1]] }] },
  { a: '🛢️ OPEC+ meeting on Day {d}. Oil traders on edge', o: [
    { t: 'OPEC+ cuts production; crude jumps', fx: [['s', 'energy', 5, 10], ['s', 'travel', -6, -2]] },
    { t: 'OPEC+ raises output; crude slides', fx: [['s', 'energy', -8, -3], ['s', 'travel', 3, 6]] }] },
];
// Company verdict events use {c}
const COMPANY_EVENTS = [
  { a: '⚖️ Supreme Court verdict on {c} case on Day {d}', o: [
    { t: '{c} WINS Supreme Court case! ⚖️', fx: [['c', '', 10, 20]] },
    { t: '{c} LOSES Supreme Court case, ₹{n} Cr penalty', fx: [['c', '', -20, -10]] }] },
  { a: '💊 {c} drug trial results on Day {d}', sec: 'pharma', o: [
    { t: '{c} trial a SUCCESS! 🧪', fx: [['c', '', 15, 35]] },
    { t: '{c} trial FAILS, drug shelved', fx: [['c', '', -35, -15]] }] },
  { a: '📱 {c} big product launch event on Day {d}', o: [
    { t: '{c} launch event wows the world ✨', fx: [['c', '', 5, 14]] },
    { t: '{c} launch event is cringe; stock dumps', fx: [['c', '', -12, -4]] }] },
];

const REGIMES = {
  bull:     { em: '🐂', name: 'Bull Market', drift: 0.012, vol: 1.0, sec: {}, hint: 'Stocks grind up. Gyms, co-working and kitchens thrive.' },
  bear:     { em: '🐻', name: 'Bear Market', drift: -0.012, vol: 1.2, sec: { metals: 0.004 }, hint: 'Stocks bleed. Pawn shops and gold shine. Shorting pays.' },
  sideways: { em: '😐', name: 'Sideways', drift: 0, vol: 0.8, sec: {}, hint: 'Choppy and boring. Trade the news, not the trend.' },
  bubble:   { em: '🫧', name: 'Bubble Mania', drift: 0.02, vol: 1.5, sec: { crypto: 0.03, tech: 0.015, media: 0.01 }, hint: 'Everything flies, crypto and tech most. It WILL pop.' },
  crash:    { em: '💥', name: 'CRASH', drift: -0.05, vol: 2.2, sec: { metals: 0.03, pharma: 0.02 }, hint: 'PANIC! Everything red except gold. Buy the dip?' },
  budget:   { em: '🇮🇳', name: 'Budget Week', drift: 0.003, vol: 1.7, sec: { infra: 0.008 }, hint: 'Indian markets swing wildly on policy headlines.' },
  monsoon:  { em: '🌧️', name: 'Monsoon Season', drift: 0.004, vol: 0.9, sec: { fmcg: 0.006, travel: -0.008 }, hint: 'Rural demand up, travel down. Chai sells like crazy.' },
};
// weights for next regime given current
const REGIME_NEXT = {
  bull: { bull: 2, sideways: 3, bubble: 2, bear: 2, budget: 1, monsoon: 1 },
  bear: { bear: 1, sideways: 3, bull: 3, crash: 1, budget: 1, monsoon: 1 },
  sideways: { bull: 3, bear: 2, budget: 1, monsoon: 1, bubble: 1 },
  bubble: { crash: 5, bear: 2, bubble: 1 },
  crash: { bear: 3, bull: 2, sideways: 2 },
  budget: { bull: 3, bear: 2, sideways: 2 },
  monsoon: { bull: 2, sideways: 3, bear: 1 },
};

// Businesses: cost ₹, inc ₹/day at level 1, reg = income multiplier per regime,
// sec/k = income moves with that sector's daily change (k × % change).
const BUSINESSES = [
  { id: 'chai', em: '🍵', name: 'Chai Stall', cost: 50000, inc: 4000, reg: { monsoon: 1.8, crash: 1.1 }, desc: 'Cutting chai all day. Rain = double sales. Never really fails.' },
  { id: 'repair', em: '📱', name: 'Mobile Repair Shop', cost: 100000, inc: 8000, reg: { bear: 1.4, crash: 1.5, bull: 0.9 }, desc: 'When times are bad, people repair instead of buying new.' },
  { id: 'rick', em: '🛺', name: 'Auto-rickshaw Fleet', cost: 150000, inc: 12500, sec: 'energy', k: -2, reg: {}, desc: 'Fuel prices up = profits down. Watch oil news!' },
  { id: 'kitchen', em: '🍛', name: 'Cloud Kitchen', cost: 250000, inc: 21000, sec: 'fmcg', k: 1, reg: { bull: 1.2, crash: 0.6, monsoon: 1.3 }, desc: 'Biryani by delivery. Sometimes goes viral.' },
  { id: 'gym', em: '🏋️', name: 'Gym', cost: 400000, inc: 32000, reg: { bull: 1.4, bubble: 1.5, bear: 0.7, crash: 0.4 }, desc: 'People join gyms when they feel rich.' },
  { id: 'gold', em: '💍', name: 'Gold & Pawn Shop', cost: 500000, inc: 35000, sec: 'metals', k: 1, reg: { bear: 1.8, crash: 3, bull: 0.6, bubble: 0.5 }, desc: 'The hedge. Booms when everyone else is crying.' },
  { id: 'cricket', em: '🏏', name: 'Cricket Academy', cost: 800000, inc: 55000, reg: {}, special: 'ipl', desc: 'Triple income during IPL season (last 6 days of every 20).' },
  { id: 'petrol', em: '⛽', name: 'Petrol Pump', cost: 1200000, inc: 95000, sec: 'energy', k: 2, reg: { crash: 0.8 }, desc: 'Oil price up = margins up. Opposite of rickshaws.' },
  { id: 'cowork', em: '🏢', name: 'Co-working Space', cost: 2500000, inc: 175000, sec: 'tech', k: 1, reg: { bull: 1.3, bubble: 1.5, bear: 0.6, crash: 0.4 }, desc: 'Startups rent desks. Tech crash = empty desks.' },
  { id: 'film', em: '🎬', name: 'Film Production', cost: 3000000, inc: 0, reg: {}, special: 'film', desc: 'No daily income. Random releases: blockbuster or flop!' },
  { id: 'flats', em: '🏠', name: 'Rental Flats', cost: 5000000, inc: 275000, sec: 'infra', k: 0.5, reg: { crash: 0.8 }, desc: 'Steady rent from 20 flats. Boring and beautiful.' },
  { id: 'resort', em: '🏨', name: 'Goa Beach Resort', cost: 8000000, inc: 650000, sec: 'travel', k: 1.5, reg: { monsoon: 0.3, bull: 1.2 }, special: 'season', desc: 'Peak season (first 6 days of every 15) = 2x. Monsoon kills it.' },
  { id: 'itfirm', em: '💻', name: 'IT Outsourcing Firm', cost: 15000000, inc: 1100000, sec: 'tech', k: 1.5, reg: { bear: 0.8 }, desc: 'Coders for US clients. Rides the global tech cycle.' },
  { id: 'mining', em: '⛏️', name: 'Crypto Mining Farm', cost: 20000000, inc: 1400000, sec: 'crypto', k: 3, reg: { bubble: 3, bear: 0.4, crash: 0 }, desc: 'Prints money in a bubble. Zero in a crash.' },
  { id: 'startup', em: '🚀', name: 'Tech Startup', cost: 50000000, inc: -800000, reg: {}, special: 'startup', desc: 'Burns cash daily. Tiny daily chance of a 10-40x exit... or death.' },
];

const BIZ_EVENTS = [
  ['🔍 Health inspector fined your {b}', 0.2],
  ['📸 Viral Instagram reel! {b} income tripled today', 3],
  ['🌊 Waterlogging shut your {b} for the day', 0],
  ['🎉 Festival rush at your {b}: double income', 2],
  ['👮 "Chai-paani" demanded at your {b}', 0.6],
  ['⭐ Celebrity visited your {b}! Sales boom', 2.5],
  ['⚡ Power cut at your {b}', 0.5],
];

// Daily choice cards. cost = fraction of cash, p = win chance, x = payout multiple, d = days to resolve
const CARDS = [
  { q: 'Your cousin Pappu wants {amt} for his "Uber for cows" startup. 🐄', cost: 0.1, p: 0.2, x: 6, d: 4, win: 'Pappu\'s cow app got funded! You get {amt}.', lose: 'The cows unionised. Pappu\'s startup is dead.' },
  { q: 'A Telegram group promises 3x returns in 2 days. "100% guaranteed!!" 📲', cost: 0.1, p: 0.05, x: 3, d: 2, win: 'WHAT? It actually paid {amt}!', lose: 'Telegram group deleted. Money gone. Obviously.' },
  { q: 'Neighbour sells his old scooter cheap. Buy and flip it for {amt}? 🛵', cost: 0.03, p: 0.7, x: 1.6, d: 1, win: 'Flipped the scooter for {amt}!', lose: 'Scooter engine died on the test ride.' },
  { q: 'Uncle needs {amt} for a shaadi. He promises to return it with 10% interest. 💒', cost: 0.05, p: 0.6, x: 1.1, d: 5, win: 'Uncle returned {amt}. A man of honour!', lose: 'Uncle "forgot". He will always forget.' },
  { q: 'Buy a lottery ticket for {amt}? 🎟️', cost: 0.01, p: 0.03, x: 50, d: 1, win: 'JACKPOT!!! You won {amt}! 🎰', lose: 'Not even close. Classic.' },
  { q: 'Friend\'s chai franchise needs {amt}. Invest? 🍵', cost: 0.08, p: 0.5, x: 2.2, d: 3, win: 'Chai franchise booming! Got {amt}.', lose: 'Franchise shut down. The chai was too sweet.' },
  { q: 'Bet {amt} on India winning the World Cup final? 🏏 (just for fun... right?)', cost: 0.05, p: 0.5, x: 1.9, d: 1, win: 'INDIA WINS! 🇮🇳 You collect {amt}!', lose: 'Heartbreak in the final over. 💔' },
  { q: 'A "Dubai prince" wants you as a {amt} business partner. 🤴', cost: 0.15, p: 0.15, x: 5, d: 4, win: 'He was real?! Partnership paid {amt}!', lose: 'The prince was a guy in Jamtara.' },
  { q: 'Buy gold jewellery worth {amt} as an "investment"? 💍', cost: 0.1, p: 0.65, x: 1.25, d: 5, win: 'Gold rallied. Sold for {amt}.', lose: 'Making charges ate everything. Mummy is happy though.' },
  { q: 'Agent: "Plot near the future airport, sir! Only {amt}!" 🛬', cost: 0.2, p: 0.35, x: 3, d: 6, win: 'Airport announced! Plot sold for {amt}! ✈️', lose: 'The airport went to the other side of town.' },
  { q: 'An NFT of a monkey in sunglasses is selling for {amt}. 🐒😎', cost: 0.05, p: 0.1, x: 10, d: 2, win: 'A whale bought your monkey for {amt}!', lose: 'Your monkey is now worth one samosa.' },
  { q: 'Your CA suggests a safe tax-saving bond for {amt}. 📑', cost: 0.1, p: 0.97, x: 1.08, d: 5, win: 'Bond matured: {amt}. Boring but beautiful.', lose: 'The bond issuer defaulted?! Rare, but here we are.' },
  { q: 'Bhabhi\'s homemade pickle business needs {amt}. 🥭', cost: 0.04, p: 0.6, x: 2, d: 4, win: 'Pickles sold out on Instagram! Got {amt}.', lose: 'Too spicy for the market. Delicious failure.' },
  { q: 'A crypto influencer launches $DOGEBHAI. Ape in with {amt}? 🐕', cost: 0.08, p: 0.15, x: 8, d: 2, win: '$DOGEBHAI mooned!! Cashed out {amt}! 🌕', lose: 'Rug pulled. Influencer moved to Bali.' },
  { q: 'A local politician offers a "tender" for {amt}. Shady... 🤫', cost: 0.12, p: 0.4, x: 2.5, d: 3, win: 'Tender went through. {amt} in your account.', lose: 'Politician lost the election. Tender cancelled.' },
];

const IPO_NAMES = [
  ['Desi', 'Bharat', 'Nova', 'Turbo', 'Quantum', 'Mega', 'Swadeshi', 'Hyper', 'Galaxy', 'Jugaadu', 'Rocket', 'Cyber', 'Shakti', 'Zen', 'Tez'],
  ['AI', 'Pay', 'Mart', 'Foods', 'Motors', 'Labs', 'Cloud', 'Energy', 'Bank', 'Media', 'Infra', 'Pharma', 'Fly', 'Coin', 'Steel'],
];
const IPO_SEC = { AI: 'tech', Pay: 'crypto', Mart: 'fmcg', Foods: 'fmcg', Motors: 'auto', Labs: 'pharma', Cloud: 'tech', Energy: 'energy', Bank: 'bank', Media: 'media', Infra: 'infra', Pharma: 'pharma', Fly: 'travel', Coin: 'crypto', Steel: 'metals' };

const TITLES = [
  [0, '🧑‍🎓 Intern'], [200000, '📈 Day Trader'], [1000000, '🦈 Dalal Street Shark'], [10000000, '🎉 Crorepati'],
  [100000000, '🏦 Mini Tycoon'], [1000000000, '👑 Arbpati'], [10000000000, '🌍 Global Mogul'],
];

const RIVALS = [
  { name: 'Rakesh Uncle', em: '👴', beta: 0.9, vol: 0.03, edge: 0.004 },
  { name: 'Wall St Wolf', em: '🐺', beta: 1.4, vol: 0.06, edge: 0.003 },
  { name: 'Crypto Bro', em: '🤑', beta: 2.5, vol: 0.12, edge: 0.002 },
];
