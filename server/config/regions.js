/**
 * Countries, regions and the event culture of each, used to make Smartie's
 * themes, decor designs and pictures fit where the event happens, and to show
 * prices in the right currency.
 *
 * Amounts are stored in US dollars (the platform's base currency); each user
 * sees them in their own country's currency (see services/rates.js).
 */

const PAKISTAN_REGIONS = {
    Punjab: 'Punjabi (Lahore, Faisalabad, Multan): Mughal heritage of Lahore (Badshahi Mosque arches, Shalimar garden fountains), phulkari embroidery, marigold (genda) and rose garlands, mirror work, brass and copper diyas, dhol and bhangra energy; bold reds, greens, oranges and gold',
    Sindh: 'Sindhi (Karachi, Hyderabad, Sukkur): ajrak block print in deep crimson, indigo and black, rilli patchwork, Hala blue kashi tiles, Thar mirror-work and Sindhi topi motifs, jasmine (motia) garlands; Karachi weddings lean modern and glamorous under marquees',
    'Khyber Pakhtunkhwa': 'Pashtun (Peshawar, Swat, Mardan): Swati carved walnut-wood panels, Afghan and Pashtun rugs and kilims, floor seating with gao-takiya bolsters, Peshawari brass lamps and lanterns, deep maroon, rust and gold, attan circle space; modest, family-centred layouts',
    Balochistan: 'Balochi (Quetta, Gwadar): Balochi pashk embroidery with geometric mirror-work, tent (gidaan) style draping, hand-woven rugs, floor majlis seating, earthy red, black and saffron with gold accents',
    'Islamabad Capital Territory': 'Islamabad and Rawalpindi: contemporary, refined decor with Margalla-hill greenery, white florals, crystal and soft gold, clean lines and modern lighting, Faisal Mosque inspired geometry',
    'Gilgit-Baltistan': 'Gilgit-Baltistan (Hunza, Skardu): carved Hunza wood architecture, Balti and Shina patterns, patti woollen textiles, apricot and cherry blossom florals, mountain-lodge warmth with lanterns and natural wood',
    'Azad Kashmir': 'Kashmiri (Muzaffarabad, Mirpur): papier-mache patterns, sozni shawl embroidery, carved walnut wood, chinar leaf motifs, soft saffron, emerald and ivory',
};

const COUNTRIES = {
    PK: { name: 'Pakistan', currency: 'PKR', regions: Object.keys(PAKISTAN_REGIONS) },
    AE: { name: 'United Arab Emirates', currency: 'AED', regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Other emirates'] },
    SA: { name: 'Saudi Arabia', currency: 'SAR', regions: ['Riyadh', 'Jeddah', 'Dammam', 'Other'] },
    QA: { name: 'Qatar', currency: 'QAR', regions: ['Doha', 'Other'] },
    GB: { name: 'United Kingdom', currency: 'GBP', regions: ['London', 'Birmingham', 'Manchester', 'Bradford', 'Other'] },
    US: { name: 'United States', currency: 'USD', regions: ['New York / New Jersey', 'Texas', 'California', 'Illinois', 'Other'] },
    CA: { name: 'Canada', currency: 'CAD', regions: ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Other'] },
    AU: { name: 'Australia', currency: 'AUD', regions: ['Sydney', 'Melbourne', 'Other'] },
};

const ABROAD = {
    AE: 'Pakistani families in the Gulf: Pakistani traditions in a grand banquet hall or hotel, with Arabian majlis touches, Islamic geometric screens, white and gold',
    SA: 'Pakistani families in Saudi Arabia: Pakistani traditions kept modest, with Arabian majlis touches, Islamic geometric screens, white and gold; family and ladies sections',
    QA: 'Pakistani families in Qatar: Pakistani traditions in a hotel ballroom with Arabian majlis touches, white and gold',
    GB: 'British-Pakistani families: Pakistani traditions in a UK banquet hall, the same stages, mehndi colours and florals, with modern lighting',
    US: 'Pakistani-American families: Pakistani traditions in a US banquet hall, the same stages, mehndi colours and florals, with modern lighting',
    CA: 'Pakistani-Canadian families: Pakistani traditions in a Canadian banquet hall, the same stages, mehndi colours and florals, with modern lighting',
    AU: 'Pakistani-Australian families: Pakistani traditions in a reception venue, the same stages, mehndi colours and florals, with modern lighting',
};

// How each Pakistani event is set up. Western wedding elements (church altar,
// aisle chairs facing an arch, champagne towers, bar) do not belong.
const EVENT_CULTURE = {
    mehndi: 'Pakistani mehndi/mayun night: yellow, orange, green and pink, marigold strings and phoolon ki chadar canopy, a low floral jhoola swing or takht for the bride, floor seating with colourful gao-takiya cushions and rugs, brass diyas and matkas, dholki corner, mirror-work and gota fabric drapes',
    mayun: 'Pakistani mayun (ubtan) ceremony: yellow and marigold everywhere, simple floor seating with cushions, a low decorated chowki for the bride, flower garlands, brass trays for ubtan and mehndi',
    baraat: 'Pakistani baraat (rukhsati): deep red, maroon and gold, a grand raised stage with a royal sofa for the couple, rich floral backdrop with red roses, crystal chandeliers, a flower-lined entrance walkway for the baraat arrival, banquet hall or marquee with round guest tables',
    nikah: 'Pakistani nikah: ivory, white, soft gold and blush, a serene floral stage or a mosque-inspired arch (jharokha) with jaali screens, a low table for signing the nikah nama, sheer drapes, fresh white roses, tuberoses (rajnigandha) and jasmine, separate seating for the families, modest and calm',
    walima: 'Pakistani walima reception hosted by the groom\'s family: elegant pastel, ivory, champagne and gold, a raised couple\'s stage with a luxurious sofa (not chairs facing an altar), a lush fresh-flower backdrop of roses and hydrangeas with soft fairy lights, crystal chandeliers, round dinner tables with tall centrepieces for the guests, a banquet hall or marquee, graceful and modest',
    wedding: 'Pakistani wedding: a raised couple\'s stage with a sofa, a grand floral backdrop, chandeliers, marquee or banquet hall, round guest tables',
    engagement: 'Pakistani engagement (mangni): blush, gold and ivory, a floral backdrop with the couple\'s initials, ring tray table, sofa seating',
    dholki: 'Pakistani dholki night: colourful floor seating, dhol, rugs, cushions, fairy lights and marigolds',
    aqiqah: 'Pakistani aqiqah gathering: soft pastels, simple floral table, family seating, modest',
    birthday: 'Pakistani family birthday party: a themed backdrop with the child\'s name, balloon garlands, a cake table and a photo corner, family-friendly',
    corporate: 'corporate event in Pakistan: clean branded stage, podium, lounge seating and modern lighting',
    conference: 'conference in Pakistan: stage with screen, podium, truss lighting and neat seating rows',
};

// Short versions for the picture model, which follows short prompts best.
const EVENT_LOOK = {
    mehndi: 'Pakistani mehndi night decor, marigold garlands, floral jhoola swing, floor cushions and gao-takiya, brass diyas, colourful gota drapes',
    mayun: 'Pakistani mayun decor, yellow marigolds, low decorated chowki, floor cushions, brass trays',
    baraat: 'Pakistani baraat wedding stage, royal couple sofa on a raised stage, red roses backdrop, crystal chandeliers',
    nikah: 'Pakistani nikah setup, ivory floral jharokha arch with jaali screens, white roses and jasmine, nikah signing table',
    walima: 'Pakistani walima reception stage, luxurious couple sofa on a raised stage, lush fresh flower backdrop with roses and fairy lights, crystal chandeliers, round dinner tables with tall centrepieces',
    wedding: 'Pakistani wedding stage, couple sofa on a raised stage, grand floral backdrop, chandeliers',
    engagement: 'Pakistani engagement stage, floral backdrop with initials, sofa',
    dholki: 'Pakistani dholki night, floor seating with rugs and cushions, dhol, marigolds, fairy lights',
    birthday: 'birthday party setup, themed backdrop with name board, balloon garland, cake table',
    corporate: 'corporate event stage, branded backdrop, podium, lounge seating',
    conference: 'conference stage, screen, podium, truss lighting',
};
const REGION_LOOK = {
    Punjab: 'Punjabi style, Mughal arches, phulkari and mirror-work accents',
    Sindh: 'Sindhi style, ajrak patterns, blue kashi tiles, mirror work',
    'Khyber Pakhtunkhwa': 'Pashtun style, carved walnut wood panels, Afghan rugs, brass lanterns',
    Balochistan: 'Balochi style, geometric mirror embroidery, tent draping, woven rugs',
    'Islamabad Capital Territory': 'contemporary Islamabad style, white florals, greenery, crystal',
    'Gilgit-Baltistan': 'Hunza style, carved wood, woollen textiles, apricot blossoms',
    'Azad Kashmir': 'Kashmiri style, papier-mache motifs, sozni embroidery, carved walnut wood',
};

/** A short phrase for the picture model: the event's Pakistani look plus the region's touch. */
function lookFor(locale = {}, eventType = '') {
    const { country, region } = normalise(locale);
    const event = pick(EVENT_LOOK, eventType) || EVENT_LOOK.wedding;
    const place = country === 'PK' ? (region ? REGION_LOOK[region] : null) : 'Pakistani wedding traditions in a banquet hall';
    return [event, place].filter(Boolean).join(', ');
}

const pick = (map, text) => {
    const t = String(text || '').toLowerCase();
    const key = Object.keys(map).find((k) => t.includes(k));
    return key ? map[key] : null;
};

const normalise = ({ country, region } = {}) => {
    const c = COUNTRIES[String(country || '').toUpperCase()] ? String(country).toUpperCase() : 'PK';
    const r = COUNTRIES[c].regions.includes(region) ? region : null;
    return { country: c, region: r };
};

/**
 * A short description of the culture an event's decor should follow, for the
 * AI that designs it and for the picture model.
 */
function cultureFor(locale = {}, eventType = '') {
    const { country, region } = normalise(locale);
    const event = pick(EVENT_CULTURE, eventType) || EVENT_CULTURE.wedding;
    const place = country === 'PK'
        ? (region ? PAKISTAN_REGIONS[region] : 'Pakistani (mixed regional influences: Mughal, Punjabi, Sindhi, Pashtun)')
        : ABROAD[country];
    return { event, place, country, region, label: region ? `${region}, ${COUNTRIES[country].name}` : COUNTRIES[country].name };
}

module.exports = { COUNTRIES, PAKISTAN_REGIONS, EVENT_CULTURE, cultureFor, lookFor, normalise };
