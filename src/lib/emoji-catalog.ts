export type EmojiCatalogEntry = {
  value: string;
  label: string;
  keywords: readonly string[];
};

type EmojiRow = readonly [value: string, label: string, aliases: string];

function group(
  categoryKeywords: string,
  rows: readonly EmojiRow[],
): EmojiCatalogEntry[] {
  const category = categoryKeywords.split("|");
  return rows.map(([value, label, aliases]) => ({
    value,
    label,
    keywords: [...category, ...aliases.split("|")],
  }));
}

/**
 * A deliberately local, bilingual collection: no search service, tracking, or
 * network request is needed to choose an appearance for a private medication.
 * Values stay as single emoji graphemes so they can be saved as medication icons.
 */
export const EMOJI_CATALOG: readonly EmojiCatalogEntry[] = [
  ...group("nature|natur|plant|plants|pflanze|pflanzen|botanical|botanik", [
    [
      "💐",
      "Bouquet",
      "flowers|blumen|blumenstrauß|blumenstrauss|gift|geschenk",
    ],
    [
      "🌸",
      "Cherry blossom",
      "flower|blume|kirschblüte|kirschbluete|spring|frühling|fruehling|pink|rosa",
    ],
    ["💮", "White flower", "blume|blüte|bluete|weiß|weiss"],
    ["🏵️", "Rosette", "flower|blume|rosette|blüte|bluete"],
    ["🌹", "Rose", "flower|blume|red|rot|love|liebe"],
    ["🥀", "Wilted flower", "rose|blume|welk|wilt|petal|blütenblatt"],
    ["🌺", "Hibiscus", "flower|blume|hibiskus|tropical|tropisch"],
    ["🌻", "Sunflower", "flower|blume|sonnenblume|yellow|gelb|sun|sonne"],
    [
      "🌼",
      "Blossom",
      "flower|blume|daisy|gänseblümchen|gaensebluemchen|blüte|bluete",
    ],
    ["🌷", "Tulip", "flower|blume|tulpe|spring|frühling|fruehling"],
    ["🌱", "Seedling", "sprout|seed|samen|keimling|growth|wachsen|new|neu"],
    ["🪴", "Potted plant", "houseplant|topfpflanze|zimmerpflanze|pot|topf"],
    ["🌲", "Evergreen tree", "pine|tanne|fichte|baum|tree|forest|wald"],
    ["🌳", "Deciduous tree", "baum|tree|laubbaum|forest|wald|bäume|baeume"],
    ["🌴", "Palm tree", "palme|baum|tree|tropical|tropisch|island|insel"],
    ["🌵", "Cactus", "kaktus|succulent|sukkulente|desert|wüste|wueste"],
    ["🌾", "Sheaf of rice", "grain|getreide|reis|wheat|weizen|harvest|ernte"],
    [
      "🌿",
      "Herb",
      "leaf|leaves|blatt|blätter|blaetter|kraut|kräuter|kraeuter|green|grün|gruen",
    ],
    ["☘️", "Shamrock", "clover|klee|irish|irisch|green|grün|gruen"],
    [
      "🍀",
      "Four-leaf clover",
      "luck|lucky|glück|glueck|glücksklee|clover|klee",
    ],
    ["🍁", "Maple leaf", "ahorn|blatt|leaf|autumn|fall|herbst|orange"],
    ["🍂", "Fallen leaves", "leaf|blatt|blätter|blaetter|autumn|fall|herbst"],
    [
      "🍃",
      "Leaf in the wind",
      "leaves|blatt|blätter|blaetter|wind|breeze|brise",
    ],
    ["🍄", "Mushroom", "pilz|forest|wald|toadstool|fliegenpilz"],
    [
      "🪷",
      "Lotus",
      "flower|blume|lotusblüte|lotusbluete|calm|ruhe|water|wasser",
    ],
    ["🪻", "Hyacinth", "flower|blume|hyazinthe|lavender|lavendel|purple|lila"],
  ]),
  ...group("nature|natur|animal|animals|tier|tiere", [
    ["🐶", "Dog", "hund|puppy|welpe|pet|haustier"],
    ["🐱", "Cat", "katze|kitten|kätzchen|kaetzchen|pet|haustier"],
    ["🐭", "Mouse", "maus|rodent|nager|small|klein"],
    ["🐹", "Hamster", "pet|haustier|rodent|nager"],
    ["🐰", "Rabbit", "bunny|hase|kaninchen|spring|frühling"],
    ["🦊", "Fox", "fuchs|forest|wald|orange"],
    ["🐻", "Bear", "bär|baer|brown|braun|forest|wald"],
    ["🐼", "Panda", "bear|bär|baer|bamboo|bambus"],
    ["🐨", "Koala", "australia|australien|eucalyptus|eukalyptus"],
    ["🐯", "Tiger", "cat|katze|stripes|streifen|wild"],
    ["🦁", "Lion", "löwe|loewe|cat|katze|mane|mähne|maehne"],
    ["🐮", "Cow", "kuh|farm|bauernhof|milk|milch"],
    ["🐷", "Pig", "schwein|piglet|ferkel|farm|bauernhof"],
    ["🐸", "Frog", "frosch|pond|teich|green|grün|gruen"],
    ["🐵", "Monkey", "affe|banana|banane|jungle|dschungel"],
    ["🐔", "Chicken", "huhn|henne|hen|farm|bauernhof"],
    ["🐧", "Penguin", "pinguin|bird|vogel|ice|eis"],
    ["🐦", "Bird", "vogel|sing|singen|flight|fliegen"],
    ["🐤", "Chick", "küken|kueken|baby|bird|vogel|yellow|gelb"],
    ["🦋", "Butterfly", "schmetterling|insect|insekt|wings|flügel|fluegel"],
    ["🐌", "Snail", "schnecke|slow|langsam|shell|gehäuse"],
    [
      "🐞",
      "Ladybug",
      "ladybird|marienkäfer|marienkaefer|beetle|käfer|kaefer|luck|glück",
    ],
    ["🐝", "Honeybee", "bee|biene|honey|honig|insect|insekt"],
    ["🐢", "Turtle", "tortoise|schildkröte|schildkroete|slow|langsam"],
    ["🐬", "Dolphin", "delfin|delphin|ocean|meer|sea|wasser"],
    ["🐳", "Whale", "wal|ocean|meer|sea|wasser|spout|fontäne"],
    ["🐙", "Octopus", "oktopus|krake|tentacles|tentakel|ocean|meer"],
    ["🦄", "Unicorn", "einhorn|magic|magie|fantasy|fantasie|horse|pferd"],
    [
      "🐾",
      "Paw prints",
      "paws|pfoten|paw|pfote|footprints|spuren|pet|haustier",
    ],
    ["🪶", "Feather", "feder|bird|vogel|light|leicht"],
  ]),
  ...group("nature|natur|weather|wetter|sky|himmel", [
    ["☀️", "Sun", "sonne|sunshine|sonnenschein|bright|hell|summer|sommer"],
    [
      "🌤️",
      "Sun behind a small cloud",
      "sonne|cloud|wolke|partly cloudy|heiter",
    ],
    ["☁️", "Cloud", "wolke|cloudy|bewölkt|bewoelkt|soft|weich"],
    ["🌧️", "Rain cloud", "rain|regen|cloud|wolke|rainy|regnerisch"],
    ["🌈", "Rainbow", "regenbogen|color|colour|farbe|bunt"],
    ["❄️", "Snowflake", "snow|schnee|schneeflocke|winter|cold|kalt"],
    ["🔥", "Fire", "feuer|flame|flamme|warm|heat|hitze"],
    ["🌊", "Water wave", "water|wasser|wave|welle|ocean|meer|sea"],
    ["🌙", "Crescent moon", "moon|mond|sichel|night|nacht|sleep|schlaf"],
    ["🌍", "Earth", "world|welt|erde|planet|globe|globus"],
    ["⭐", "Star", "stern|night|nacht|gold|favorite|favorit"],
    ["✨", "Sparkles", "sparkle|glitter|glitzer|funkeln|sterne|magic|magie"],
  ]),
  ...group(
    "people|person|human|menschen|mensch|face|gesicht|emotion|gefühl|gefuehl",
    [
      [
        "😀",
        "Grinning face",
        "smile|happy|lächeln|laecheln|glücklich|gluecklich|freude",
      ],
      [
        "😊",
        "Smiling face",
        "smile|happy|lächeln|laecheln|friendly|freundlich|warm",
      ],
      [
        "🥰",
        "Smiling face with hearts",
        "love|liebe|hearts|herzen|happy|glücklich",
      ],
      [
        "😎",
        "Smiling face with sunglasses",
        "cool|sunglasses|sonnenbrille|sun|sonne",
      ],
      ["🤩", "Star-struck face", "stars|sterne|excited|begeistert|wow"],
      [
        "🥳",
        "Partying face",
        "party|celebrate|feiern|birthday|geburtstag|confetti|konfetti",
      ],
      ["🙂", "Slightly smiling face", "smile|lächeln|laecheln|okay|fine|gut"],
      [
        "🙃",
        "Upside-down face",
        "playful|verspielt|silly|albern|upside down|kopfüber",
      ],
      ["😌", "Relieved face", "calm|ruhe|relief|erleichtert|peace|frieden"],
      [
        "😇",
        "Smiling face with halo",
        "angel|engel|halo|heiligenschein|kind|lieb",
      ],
      [
        "🤗",
        "Hugging face",
        "hug|umarmung|comfort|trost|support|unterstützung|unterstuetzung",
      ],
      [
        "🤭",
        "Face with hand over mouth",
        "giggle|kichern|laugh|lachen|shy|schüchtern",
      ],
      [
        "🫠",
        "Melting face",
        "melt|schmelzen|warm|overwhelmed|überfordert|ueberfordert",
      ],
      [
        "🥹",
        "Face holding back tears",
        "grateful|dankbar|touched|gerührt|geruehrt|proud|stolz",
      ],
      ["😴", "Sleeping face", "sleep|schlaf|sleepy|müde|muede|rest|ruhe"],
      ["🤔", "Thinking face", "think|denken|question|frage|wonder|nachdenken"],
      ["🧑", "Person", "adult|erwachsen|human|mensch"],
      ["👩", "Woman", "frau|adult|erwachsen"],
      ["👨", "Man", "mann|adult|erwachsen"],
      ["👶", "Baby", "child|kind|newborn|neugeboren"],
      ["🧓", "Older person", "older|alt|senior|elder|älter|aelter"],
      [
        "👩‍⚕️",
        "Health worker",
        "doctor|ärztin|aerztin|arzt|nurse|pflege|medizin|health|gesundheit",
      ],
      [
        "🧑‍🎨",
        "Artist",
        "art|kunst|künstler|kuenstler|paint|malen|creative|kreativ",
      ],
      ["🧑‍🚀", "Astronaut", "space|weltraum|astronautin|cosmos|kosmos"],
      ["🧑‍🍳", "Cook", "chef|koch|köchin|koechin|cooking|kochen|food|essen"],
    ],
  ),
  ...group(
    "people|menschen|hands|hand|hände|haende|body|körper|koerper|körperteile|koerperteile",
    [
      ["🧠", "Brain", "gehirn|mind|kopf|thinking|denken|mental"],
      ["👀", "Eyes", "eye|auge|augen|look|sehen|watch|schauen"],
      ["👂", "Ear", "ohr|ohren|listen|hören|hoeren|sound|ton"],
      ["💪", "Flexed biceps", "strong|stark|strength|kraft|muscle|muskel|arm"],
      ["🦵", "Leg", "bein|legs|beine|walk|gehen"],
      ["🦶", "Foot", "fuß|fuss|feet|füße|fuesse|walk|gehen"],
      [
        "🫀",
        "Anatomical heart",
        "herz|heart|pulse|puls|organ|health|gesundheit",
      ],
      ["🫁", "Lungs", "lung|lunge|lungen|breath|atmen|atem"],
      ["🦴", "Bone", "knochen|skeleton|skelett"],
      ["🦷", "Tooth", "zahn|teeth|zähne|zaehne|dentist|zahnarzt"],
      [
        "🖐️",
        "Hand with fingers splayed",
        "five|fünf|fuenf|palm|handfläche|handflaeche",
      ],
      ["👋", "Waving hand", "wave|winken|hello|hallo|hi|bye|tschüss|tschuess"],
      ["👌", "OK hand", "okay|ok|good|gut|perfect|perfekt"],
      ["✌️", "Victory hand", "peace|frieden|victory|sieg|two|zwei"],
      [
        "🤞",
        "Crossed fingers",
        "luck|glück|glueck|hope|hoffnung|finger|fingers",
      ],
      ["🤟", "Love-you gesture", "love|liebe|sign|zeichen"],
      ["🤘", "Sign of the horns", "rock|metal|music|musik|horns|hörner"],
      ["👍", "Thumbs up", "thumb|daumen|yes|ja|good|gut|done|erledigt"],
      ["🙌", "Raising hands", "hooray|hurra|celebrate|feiern|success|erfolg"],
      [
        "🤝",
        "Handshake",
        "agreement|einverstanden|together|zusammen|support|hilfe",
      ],
      [
        "🙏",
        "Folded hands",
        "thanks|danke|please|bitte|prayer|gebet|grateful|dankbar",
      ],
      [
        "👏",
        "Clapping hands",
        "clap|klatschen|applause|applaus|bravo|well done|gut gemacht",
      ],
    ],
  ),
  ...group("food|essen|fruit|obst|frucht|vegetable|vegetables|gemüse|gemuese", [
    ["🍎", "Red apple", "apple|apfel|red|rot"],
    ["🍐", "Pear", "birne|green|grün|gruen"],
    ["🍊", "Tangerine", "orange|mandarin|mandarine|citrus|zitrus"],
    ["🍋", "Lemon", "zitrone|citrus|zitrus|yellow|gelb"],
    ["🍌", "Banana", "banane|yellow|gelb"],
    ["🍉", "Watermelon", "melon|melone|wassermelone|summer|sommer"],
    ["🍇", "Grapes", "grape|traube|trauben|weintrauben|purple|lila"],
    ["🍓", "Strawberry", "erdbeere|berry|beere|red|rot"],
    [
      "🫐",
      "Blueberries",
      "blueberry|blaubeere|heidelbeere|berry|beere|blue|blau",
    ],
    ["🍒", "Cherries", "cherry|kirsche|kirschen|red|rot"],
    ["🍑", "Peach", "pfirsich|orange"],
    ["🥭", "Mango", "tropical|tropisch|orange"],
    ["🍍", "Pineapple", "ananas|tropical|tropisch"],
    ["🥝", "Kiwi fruit", "kiwi|kiwifrucht|green|grün|gruen"],
    ["🥑", "Avocado", "green|grün|gruen|guacamole"],
    ["🍅", "Tomato", "tomate|red|rot"],
    ["🥕", "Carrot", "karotte|möhre|moehre|orange"],
    ["🌽", "Ear of corn", "corn|mais|maiskolben|yellow|gelb"],
    ["🥦", "Broccoli", "brokkoli|green|grün|gruen"],
    ["🥒", "Cucumber", "gurke|green|grün|gruen"],
    ["🥔", "Potato", "kartoffel|erdapfel|erdäpfel|erdaepfel"],
    ["🍠", "Sweet potato", "süßkartoffel|suesskartoffel|yam|roasted|gebacken"],
  ]),
  ...group("food|essen|meal|mahlzeit|drink|drinks|trinken|getränk|getraenk", [
    ["🍞", "Bread", "brot|bakery|bäckerei|baeckerei|toast"],
    [
      "🥐",
      "Croissant",
      "gebäck|gebaeck|bakery|bäckerei|breakfast|frühstück|fruehstueck",
    ],
    ["🥨", "Pretzel", "brezel|breze|bakery|bäckerei|snack"],
    ["🧀", "Cheese", "käse|kaese|dairy|milchprodukt"],
    ["🥚", "Egg", "ei|eggs|eier|breakfast|frühstück"],
    ["🍳", "Cooking", "fried egg|spiegelei|pan|pfanne|breakfast|frühstück"],
    ["🥞", "Pancakes", "pancake|pfannkuchen|palatschinken|breakfast|frühstück"],
    ["🧇", "Waffle", "waffel|breakfast|frühstück|sweet|süß|suess"],
    ["🥗", "Green salad", "salad|salat|bowl|schüssel|schuessel|fresh|frisch"],
    ["🍜", "Steaming bowl", "noodles|nudeln|ramen|soup|suppe|warm"],
    ["🍣", "Sushi", "fish|fisch|rice|reis|japanese|japanisch"],
    ["🍱", "Bento box", "bento|lunch|mittagessen|japanese|japanisch"],
    ["🍕", "Pizza", "slice|stück|stueck|italian|italienisch"],
    ["🍔", "Hamburger", "burger|sandwich|snack"],
    ["🌮", "Taco", "mexican|mexikanisch|snack"],
    ["🍿", "Popcorn", "cinema|kino|corn|mais|snack"],
    ["🍪", "Cookie", "keks|biscuit|chocolate|schokolade|sweet|süß|suess"],
    ["🍩", "Doughnut", "donut|krapfen|sweet|süß|suess"],
    ["🍰", "Shortcake", "cake|kuchen|torte|sweet|süß|suess"],
    ["🍫", "Chocolate bar", "chocolate|schokolade|sweet|süß|suess"],
    ["🍯", "Honey pot", "honey|honig|sweet|süß|suess|jar|glas"],
    ["☕", "Hot beverage", "coffee|kaffee|tea|tee|cup|tasse|warm"],
    ["🍵", "Teacup", "tea|tee|matcha|cup|tasse|green|grün"],
    ["🧋", "Bubble tea", "boba|tea|tee|tapioca|tapioka"],
    ["🥤", "Cup with straw", "cup|becher|soda|softdrink|straw|strohhalm"],
    ["🥛", "Glass of milk", "milk|milch|glass|glas|white|weiß"],
    ["💧", "Droplet", "water|wasser|drop|tropfen|hydration|trinken"],
  ]),
  ...group(
    "activity|activities|aktivität|aktivitäten|aktivitaet|aktivitaeten|sport|sports",
    [
      ["⚽", "Soccer ball", "football|soccer|fußball|fussball|ball"],
      ["🏀", "Basketball", "ball|basket|korb"],
      ["🏈", "American football", "football|ball|american|amerikanisch"],
      ["⚾", "Baseball", "ball|bat|schläger|schlaeger"],
      ["🎾", "Tennis", "ball|racket|schläger|schlaeger"],
      ["🏐", "Volleyball", "ball|beach|strand"],
      ["🏓", "Ping pong", "table tennis|tischtennis|paddle|schläger"],
      ["🏸", "Badminton", "shuttlecock|federball|racket|schläger"],
      ["🥊", "Boxing glove", "boxing|boxen|glove|handschuh"],
      ["🛼", "Roller skate", "skating|rollschuh|rollschuhe|rollen"],
      ["🛹", "Skateboard", "skate|board|skaten"],
      [
        "🏃",
        "Running person",
        "run|running|laufen|joggen|jogging|runner|läufer",
      ],
      [
        "🚶",
        "Walking person",
        "walk|walking|gehen|spaziergang|spazieren|steps|schritte",
      ],
      [
        "🧘",
        "Person in lotus position",
        "yoga|meditation|meditieren|calm|ruhe|mindful|achtsam",
      ],
      ["🏊", "Swimming person", "swim|swimming|schwimmen|water|wasser|pool"],
      ["🚴", "Cycling person", "bike|bicycle|cycling|radfahren|fahrrad|rad"],
      ["💃", "Dancing woman", "dance|dancing|tanzen|tanz|music|musik"],
      ["🏆", "Trophy", "winner|gewinner|win|sieg|success|erfolg|pokal"],
      ["🎖️", "Medal", "award|auszeichnung|medaille|achievement|erfolg"],
    ],
  ),
  ...group(
    "activity|activities|aktivität|aktivitäten|aktivitaeten|hobby|play|spielen|creative|kreativ",
    [
      ["🎯", "Bullseye", "target|ziel|dart|focus|fokus"],
      ["🧩", "Puzzle piece", "puzzle|jigsaw|puzzleteil|piece|teil"],
      [
        "🎲",
        "Game die",
        "dice|würfel|wuerfel|game|spiel|board game|brettspiel",
      ],
      ["♟️", "Chess pawn", "chess|schach|game|spiel|pawn|bauer"],
      ["🎮", "Video game", "gaming|controller|game|spiel|console|konsole"],
      ["🎨", "Artist palette", "art|kunst|paint|malen|color|farbe|palette"],
      ["🧵", "Thread", "sewing|nähen|naehen|thread|faden|spool|spule"],
      ["🧶", "Yarn", "wool|wolle|knit|stricken|crochet|häkeln|haekeln"],
      ["🎭", "Performing arts", "theater|theatre|drama|mask|maske"],
      ["🎬", "Clapper board", "film|movie|cinema|kino|clapper|filmklappe"],
      ["🎪", "Circus tent", "circus|zirkus|tent|zelt|show"],
      ["🎈", "Balloon", "ballon|party|birthday|geburtstag|celebrate|feiern"],
      ["🎉", "Party popper", "party|confetti|konfetti|celebrate|feiern|hurra"],
    ],
  ),
  ...group(
    "activity|activities|aktivität|aktivitäten|musik|music|sound|klang",
    [
      ["🎤", "Microphone", "mic|mikrofon|sing|singen|karaoke"],
      ["🎧", "Headphones", "kopfhörer|kopfhoerer|listen|hören|hoeren|audio"],
      [
        "🎼",
        "Musical score",
        "score|noten|notenschlüssel|notenschluessel|compose|komponieren",
      ],
      ["🎹", "Musical keyboard", "piano|klavier|keyboard|keys|tasten"],
      ["🎸", "Guitar", "gitarre|rock|strings|saiten|instrument"],
      ["🎺", "Trumpet", "trompete|brass|blech|jazz|instrument"],
      ["🥁", "Drum", "drums|trommel|schlagzeug|rhythm|rhythmus|instrument"],
      ["🎻", "Violin", "geige|violine|strings|saiten|instrument"],
      ["🎵", "Musical note", "note|noten|melody|melodie|song|lied"],
      ["🎶", "Musical notes", "notes|noten|melody|melodie|song|lied"],
    ],
  ),
  ...group("travel|reise|transport|verkehr|vehicle|fahrzeug", [
    ["🚗", "Car", "auto|wagen|drive|fahren|road|straße|strasse"],
    ["🚕", "Taxi", "cab|car|auto|yellow|gelb"],
    ["🚌", "Bus", "public transport|nahverkehr|omnibus"],
    ["🚎", "Trolleybus", "bus|oberleitungsbus|electric|elektrisch"],
    ["🏎️", "Racing car", "race|rennen|rennwagen|fast|schnell"],
    [
      "🚑",
      "Ambulance",
      "krankenwagen|rettungswagen|health|gesundheit|emergency|notfall",
    ],
    ["🚒", "Fire engine", "fire truck|feuerwehr|feuerwehrauto|rescue|rettung"],
    ["🚲", "Bicycle", "bike|fahrrad|rad|cycling|radfahren"],
    ["🛴", "Kick scooter", "scooter|roller|tretroller"],
    ["🛵", "Motor scooter", "scooter|motorroller|moped|vespa"],
    ["🏍️", "Motorcycle", "motorbike|motorrad|bike"],
    ["🚂", "Locomotive", "train|zug|steam|dampf|eisenbahn|lokomotive"],
    ["🚆", "Train", "zug|rail|bahn|eisenbahn"],
    ["🚇", "Metro", "subway|underground|ubahn|u-bahn|bahn"],
    ["✈️", "Airplane", "plane|flugzeug|flight|flug|fliegen"],
    ["🚀", "Rocket", "rakete|space|weltraum|launch|start"],
    ["🚁", "Helicopter", "hubschrauber|heli|flight|flug"],
    ["⛵", "Sailboat", "sailing|segeln|segelboot|boat|boot|sea|meer"],
    ["🚢", "Ship", "schiff|cruise|kreuzfahrt|boat|boot|sea|meer"],
    ["🛶", "Canoe", "kanu|kayak|kajak|paddle|paddeln|boat|boot"],
    ["🛟", "Ring buoy", "lifebuoy|rettungsring|float|schwimmen|rescue|rettung"],
  ]),
  ...group("travel|reise|place|places|ort|orte|destination|reiseziel", [
    [
      "🧭",
      "Compass",
      "kompass|direction|richtung|navigation|explore|entdecken",
    ],
    ["🗺️", "World map", "map|karte|landkarte|weltkarte|world|welt"],
    ["🏔️", "Snow-capped mountain", "mountain|berg|alps|alpen|snow|schnee"],
    ["⛰️", "Mountain", "berg|berge|hiking|wandern|outdoor|draußen|draussen"],
    ["🏖️", "Beach with umbrella", "beach|strand|holiday|urlaub|sea|meer"],
    ["🏝️", "Desert island", "island|insel|palm|palme|holiday|urlaub"],
    ["🏕️", "Camping", "camp|campingplatz|tent|zelt|outdoor|draußen"],
    ["🏡", "House with garden", "home|zuhause|haus|garden|garten"],
    ["🏠", "House", "home|zuhause|haus|building|gebäude|gebaeude"],
    ["🏙️", "Cityscape", "city|stadt|skyline|buildings|gebäude|gebaeude"],
    ["🏰", "Castle", "schloss|burg|fairytale|märchen|maerchen"],
    ["🗼", "Tokyo tower", "tower|turm|tokyo|japan|landmark|wahrzeichen"],
    ["⛩️", "Shinto shrine", "shrine|schrein|torii|japan|gate|tor"],
    ["🌅", "Sunrise", "sun|sonne|morning|morgen|sonnenaufgang|dawn|dämmerung"],
    ["🌇", "Sunset", "sun|sonne|evening|abend|sonnenuntergang|city|stadt"],
    ["🌉", "Bridge at night", "bridge|brücke|bruecke|night|nacht|city|stadt"],
    [
      "🎡",
      "Ferris wheel",
      "wheel|riesenrad|fair|jahrmarkt|amusement|freizeitpark",
    ],
    ["🎢", "Roller coaster", "achterbahn|amusement|freizeitpark|ride|fahrt"],
    [
      "🏥",
      "Hospital",
      "krankenhaus|clinic|klinik|health|gesundheit|medical|medizin",
    ],
  ]),
  ...group(
    "object|objects|objekt|objekte|gegenstand|gegenstände|gegenstaende|health|gesundheit|medical|medizin",
    [
      [
        "💊",
        "Pill",
        "medication|medicine|medikament|medikamente|tablette|tablet|capsule|kapsel",
      ],
      [
        "🩹",
        "Adhesive bandage",
        "bandage|pflaster|care|pflege|healing|heilung",
      ],
      [
        "🩺",
        "Stethoscope",
        "stethoskop|doctor|arzt|ärztin|aerztin|heartbeat|herzschlag",
      ],
      ["💉", "Syringe", "spritze|injection|injektion|vaccine|impfung"],
      ["🌡️", "Thermometer", "temperature|temperatur|fever|fieber|warm"],
      [
        "🧪",
        "Test tube",
        "test|reagenzglas|lab|labor|science|wissenschaft|chemistry|chemie",
      ],
      [
        "🧫",
        "Petri dish",
        "petrischale|lab|labor|science|wissenschaft|biology|biologie",
      ],
      [
        "🔬",
        "Microscope",
        "mikroskop|lab|labor|science|wissenschaft|research|forschung",
      ],
    ],
  ),
  ...group(
    "object|objects|objekt|objekte|gegenstand|gegenstände|gegenstaende",
    [
      [
        "🔭",
        "Telescope",
        "teleskop|stars|sterne|space|weltraum|astronomy|astronomie",
      ],
      ["🕯️", "Candle", "kerze|light|licht|warm|calm|ruhe"],
      ["💡", "Light bulb", "light|licht|glühbirne|gluehbirne|idea|idee"],
      ["🔦", "Flashlight", "torch|taschenlampe|light|licht"],
      ["📱", "Mobile phone", "phone|handy|smartphone|telefon"],
      ["💻", "Laptop", "computer|notebook|work|arbeit|technology|technik"],
      ["⌨️", "Keyboard", "tastatur|computer|type|tippen"],
      ["🖱️", "Computer mouse", "mouse|maus|computer|click|klick"],
      ["📷", "Camera", "kamera|photo|foto|photography|fotografie"],
      ["⏰", "Alarm clock", "clock|uhr|wecker|time|zeit|reminder|erinnerung"],
      ["⌛", "Hourglass", "sanduhr|time|zeit|timer|sand|wait|warten"],
      ["⌚", "Watch", "wristwatch|armbanduhr|clock|uhr|time|zeit"],
      ["📖", "Open book", "book|buch|read|lesen|story|geschichte"],
      ["📚", "Books", "book|buch|bücher|buecher|read|lesen|library|bibliothek"],
      [
        "📓",
        "Notebook",
        "journal|tagebuch|notizbuch|notes|notizen|log|protokoll",
      ],
      ["✏️", "Pencil", "bleistift|write|schreiben|draw|zeichnen"],
      ["🖊️", "Pen", "kugelschreiber|stift|write|schreiben|notes|notizen"],
      ["🖌️", "Paintbrush", "brush|pinsel|paint|malen|art|kunst"],
      ["✂️", "Scissors", "schere|cut|schneiden|craft|basteln"],
      ["📎", "Paperclip", "clip|büroklammer|bueroklammer|paper|papier"],
      ["🔑", "Key", "schlüssel|schluessel|unlock|aufschließen|access|zugang"],
      ["🗝️", "Old key", "key|schlüssel|schluessel|vintage|alt"],
      [
        "🔒",
        "Locked",
        "lock|schloss|private|privat|safe|sicher|privacy|datenschutz",
      ],
      [
        "🧸",
        "Teddy bear",
        "teddy|teddybär|teddybaer|bear|bär|baer|comfort|trost",
      ],
      [
        "🎁",
        "Wrapped gift",
        "gift|geschenk|present|surprise|überraschung|ueberraschung",
      ],
      [
        "🛍️",
        "Shopping bags",
        "shopping|einkaufen|bag|tasche|bags|tüten|tueten",
      ],
      ["🎒", "Backpack", "rucksack|bag|tasche|school|schule|hiking|wandern"],
      [
        "👑",
        "Crown",
        "krone|royal|königlich|koeniglich|king|könig|queen|königin",
      ],
      ["💎", "Gem stone", "gem|diamond|diamant|edelstein|jewel|juwel"],
      ["🪄", "Magic wand", "magic|magie|zauber|zauberstab|sparkle|funkeln"],
      [
        "🧿",
        "Nazar amulet",
        "amulet|amulett|evil eye|auge|protection|schutz|blue|blau",
      ],
      ["🪞", "Mirror", "spiegel|reflection|spiegelung|reflect|reflektieren"],
      ["🧺", "Basket", "korb|laundry|wäsche|waesche|picnic|picknick"],
      ["🧼", "Soap", "seife|clean|sauber|wash|waschen"],
      [
        "🪥",
        "Toothbrush",
        "zahnbürste|zahnbuerste|brush|bürste|buerste|teeth|zähne",
      ],
      ["🛁", "Bathtub", "bath|bad|badewanne|relax|entspannen|water|wasser"],
      ["🛌", "Person in bed", "bed|bett|sleep|schlafen|rest|ruhe"],
      ["🛋️", "Couch and lamp", "couch|sofa|relax|entspannen|home|zuhause"],
      ["☂️", "Umbrella", "regenschirm|schirm|rain|regen|protection|schutz"],
    ],
  ),
  ...group(
    "symbol|symbols|symbole|abstract|abstrakt|abstraktes|heart|herz|love|liebe",
    [
      ["❤️", "Red heart", "red|rot|herzen"],
      ["🧡", "Orange heart", "orange|herzen"],
      ["💛", "Yellow heart", "yellow|gelb|herzen"],
      ["💚", "Green heart", "green|grün|gruen|herzen"],
      ["💙", "Blue heart", "blue|blau|herzen"],
      ["💜", "Purple heart", "purple|violet|lila|violett|herzen"],
      ["🖤", "Black heart", "black|schwarz|herzen"],
      ["🤍", "White heart", "white|weiß|weiss|herzen"],
      ["🤎", "Brown heart", "brown|braun|herzen"],
      ["🩷", "Pink heart", "pink|rosa|herzen"],
      ["🩵", "Light blue heart", "light blue|hellblau|herzen"],
      ["🩶", "Grey heart", "grey|gray|grau|herzen"],
      ["💖", "Sparkling heart", "sparkling|glitter|glitzer|funkeln|herzen"],
      ["💝", "Heart with ribbon", "ribbon|schleife|gift|geschenk|herzen"],
      ["💗", "Growing heart", "growing|wachsen|growth|wachstum|herzen"],
      ["💕", "Two hearts", "two|zwei|friendship|freundschaft|herzen"],
      ["💞", "Revolving hearts", "revolving|drehen|together|zusammen|herzen"],
      ["💓", "Beating heart", "beat|schlagen|pulse|puls|herzschlag"],
      ["💟", "Heart decoration", "decoration|dekoration|heart|herz"],
    ],
  ),
  ...group("symbol|symbols|symbole|abstract|abstrakt|abstraktes", [
    ["☮️", "Peace symbol", "peace|frieden|peaceful|friedlich"],
    ["☯️", "Yin yang", "yin|yang|balance|gleichgewicht|harmony|harmonie"],
    ["♾️", "Infinity", "infinite|unendlich|forever|ewig|loop|schleife"],
    [
      "✅",
      "Check mark",
      "check|tick|haken|done|erledigt|success|erfolg|yes|ja",
    ],
    ["☑️", "Check box", "check|checkbox|haken|checked|abgehakt|done|erledigt"],
    ["❎", "Cross mark button", "cross|kreuz|green|grün|gruen|x"],
    [
      "❗",
      "Exclamation mark",
      "exclamation|ausrufezeichen|important|wichtig|attention|achtung",
    ],
    ["❓", "Question mark", "question|frage|fragezeichen|help|hilfe"],
    [
      "💯",
      "Hundred points",
      "hundred|hundert|100|perfect|perfekt|success|erfolg",
    ],
    ["🔆", "Bright button", "bright|hell|brightness|helligkeit|sun|sonne"],
    ["🔅", "Dim button", "dim|gedimmt|brightness|helligkeit|sun|sonne"],
    ["🔸", "Small orange diamond", "diamond|raute|orange|small|klein"],
    ["🔹", "Small blue diamond", "diamond|raute|blue|blau|small|klein"],
    ["🔶", "Large orange diamond", "diamond|raute|orange|large|groß|gross"],
    ["🔷", "Large blue diamond", "diamond|raute|blue|blau|large|groß|gross"],
    ["🔴", "Red circle", "circle|kreis|round|rund|red|rot"],
    ["🟠", "Orange circle", "circle|kreis|round|rund|orange"],
    ["🟡", "Yellow circle", "circle|kreis|round|rund|yellow|gelb"],
    ["🟢", "Green circle", "circle|kreis|round|rund|green|grün|gruen"],
    ["🔵", "Blue circle", "circle|kreis|round|rund|blue|blau"],
    ["🟣", "Purple circle", "circle|kreis|round|rund|purple|lila|violett"],
    ["⚪", "White circle", "circle|kreis|round|rund|white|weiß|weiss"],
    ["⚫", "Black circle", "circle|kreis|round|rund|black|schwarz"],
    ["🟤", "Brown circle", "circle|kreis|round|rund|brown|braun"],
    [
      "💬",
      "Speech balloon",
      "speech|sprechen|chat|talk|reden|message|nachricht",
    ],
    ["💭", "Thought balloon", "thought|gedanke|think|denken|dream|traum"],
    ["🗯️", "Anger bubble", "bubble|blase|speech|sprechen|comic|cartoon"],
    [
      "🔔",
      "Bell",
      "glocke|reminder|erinnerung|notification|benachrichtigung|ring|klingeln",
    ],
    ["💫", "Dizzy", "star|stern|orbit|umlauf|sparkle|funkeln|magic|magie"],
    ["💥", "Collision", "boom|bang|knall|burst|explosion|energy|energie"],
    ["🌀", "Cyclone", "spiral|swirl|wirbel|cyclone|zyklon|flow|fluss"],
  ]),
];

/** Normalize text, while leaving the stored emoji and display labels untouched. */
export function normalizeEmojiQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const searchIndex = EMOJI_CATALOG.map((entry) => ({
  entry,
  text: normalizeEmojiQuery([entry.label, ...entry.keywords].join(" ")),
  emoji: entry.value.replace(/\uFE0F/g, ""),
}));

/** Match English/German words together, or paste an emoji directly. */
export function searchEmoji(query: string, limit = 96): EmojiCatalogEntry[] {
  const trimmed = query.trim();
  if (!trimmed || limit <= 0 || Number.isNaN(limit)) return [];
  const maximum = Number.isFinite(limit)
    ? Math.floor(limit)
    : EMOJI_CATALOG.length;
  if (maximum < 1) return [];

  const emoji = trimmed.replace(/\uFE0F/g, "");
  const direct = searchIndex.find((item) => item.emoji === emoji);
  if (direct) return [direct.entry];

  const normalized = normalizeEmojiQuery(trimmed);
  if (!normalized) return [];
  const terms = normalized.split(" ");
  const matches: EmojiCatalogEntry[] = [];

  for (const item of searchIndex) {
    if (terms.every((term) => item.text.includes(term))) {
      matches.push(item.entry);
      if (matches.length >= maximum) break;
    }
  }
  return matches;
}
