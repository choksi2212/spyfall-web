import type { Category } from "./types.js";

const SPORTS = [
  "Basketball", "Soccer", "Tennis", "Golf", "Cricket", "Rugby", "Hockey", "Baseball",
  "Volleyball", "Badminton", "Swimming", "Marathon", "Sprint", "Referee", "Stadium",
  "Olympics", "Medal", "Trophy", "Dribble", "Penalty", "Goalkeeper", "Surfboard",
  "Skateboard", "Cycling", "Boxing", "Wrestling", "Fencing", "Archery", "Javelin",
  "Shuttlecock", "Racket", "Helmet", "Whistle", "Track", "Podium", "Coach", "Team",
  "Quarterback", "Pitcher", "Batter", "Net", "Court", "Arena", "Mascot", "Halftime",
];

const COUNTRIES = [
  "Japan", "Brazil", "Egypt", "Canada", "France", "Italy", "Spain", "Mexico",
  "India", "China", "Germany", "Norway", "Sweden", "Greece", "Portugal", "Turkey",
  "Thailand", "Vietnam", "Kenya", "Morocco", "Chile", "Peru", "Argentina",
  "Iceland", "Ireland", "Poland", "Croatia", "Serbia", "Finland", "Denmark",
  "Switzerland", "Austria", "Belgium", "Netherlands", "Australia", "New Zealand",
  "South Africa", "Nigeria", "Ghana", "Cuba", "Jamaica", "Panama", "Colombia",
  "Istanbul", "Sahara", "Amazon", "Himalaya", "Alps", "Nile", "Pacific",
];

const OBJECTS = [
  "Umbrella", "Stapler", "Chandelier", "Microscope", "Zipper", "Trampoline",
  "Binoculars", "Pillowcase", "Toaster", "Blender", "Ladder", "Hammer", "Wrench",
  "Backpack", "Wallet", "Keychain", "Mirror", "Candle", "Lantern", "Compass",
  "Telescope", "Globe", "Puzzle", "Dice", "Chess", "Domino", "Kite", "Yo-yo",
  "Scissors", "Tape", "Glue", "Clipboard", "Envelope", "Stamp", "Battery",
  "Flashlight", "Remote", "Charger", "Headphones", "Speaker", "Camera", "Tripod",
  "Notebook", "Eraser", "Ruler", "Clipboard", "Clipboard", "Thermos", "Bottle",
];

const PLACES = [
  "Hospital", "Library", "Graveyard", "Amusement Park", "Subway Station", "Rooftop",
  "Lighthouse", "Casino", "Courtroom", "Parking Garage", "Treehouse", "Airport",
  "Harbor", "Museum", "Theater", "Cathedral", "Prison", "School", "University",
  "Laboratory", "Greenhouse", "Warehouse", "Factory", "Farm", "Vineyard", "Desert",
  "Forest", "Canyon", "Waterfall", "Volcano", "Island", "Peninsula", "Harbor",
  "Market", "Bazaar", "Temple", "Shrine", "Observatory", "Planetarium", "Zoo",
  "Aquarium", "Stadium", "Hotel", "Hostel", "Cottage", "Castle", "Bunker",
];

const ANIMALS = [
  "Penguin", "Chameleon", "Jellyfish", "Woodpecker", "Scorpion", "Platypus",
  "Narwhal", "Komodo Dragon", "Firefly", "Pangolin", "Otter", "Raccoon", "Badger",
  "Walrus", "Seal", "Dolphin", "Octopus", "Squid", "Lobster", "Crab", "Shrimp",
  "Eagle", "Falcon", "Owl", "Parrot", "Peacock", "Flamingo", "Heron", "Stork",
  "Giraffe", "Zebra", "Hippo", "Rhino", "Buffalo", "Moose", "Elk", "Bison",
  "Koala", "Kangaroo", "Lemur", "Gorilla", "Chimpanzee", "Orangutan", "Sloth",
  "Anteater", "Armadillo", "Hyena", "Jackal", "Coyote", "Wolf", "Fox", "Bear",
];

const TRANSPORT = [
  "Helicopter", "Kayak", "Segway", "Rickshaw", "Submarine", "Gondola", "Bulldozer",
  "Parachute", "Hovercraft", "Cable Car", "Jet Ski", "Ferry", "Yacht", "Canoe",
  "Scooter", "Motorcycle", "Tricycle", "Caravan", "Limousine", "Taxi", "Bus",
  "Tram", "Monorail", "Locomotive", "Freighter", "Tanker", "Bicycle", "Unicycle",
  "Skates", "Sled", "Sleigh", "Snowmobile", "ATV", "Ambulance", "Firetruck",
  "Police Car", "Tractor", "Forklift", "Crane", "Excavator", "Zeppelin", "Glider",
];

const TECH = [
  "Bluetooth", "Smartphone", "Drone", "Algorithm", "Hologram", "Wi-Fi", "Robot",
  "Satellite", "Firewall", "Smartwatch", "Laptop", "Tablet", "Router", "Modem",
  "Server", "Database", "Cloud", "Streaming", "Pixel", "Codec", "USB", "HDMI",
  "Ethernet", "Blockchain", "Encryption", "Password", "Biometric", "Sensor",
  "Battery", "Circuit", "Processor", "Memory", "Keyboard", "Mouse", "Printer",
  "Scanner", "Projector", "Microphone", "Webcam", "Headset", "Console", "Joystick",
];

const SCIENCE = [
  "Volcano", "Gravity", "Telescope", "DNA", "Eclipse", "Fossil", "Bacteria",
  "Magnet", "Earthquake", "Photosynthesis", "Tornado", "Mercury", "Neutron",
  "Proton", "Electron", "Atom", "Molecule", "Periodic Table", "Catalyst", "Acid",
  "Base", "Oxygen", "Hydrogen", "Carbon", "Nitrogen", "Friction", "Velocity",
  "Momentum", "Energy", "Entropy", "Spectrum", "Prism", "Lens", "Microscope",
  "Petri Dish", "Bunsen Burner", "Beaker", "Flask", "Thermometer", "Barometer",
  "Seismograph", "Aurora", "Comet", "Meteor", "Galaxy", "Nebula", "Orbit",
];

const BY_CAT: Record<Exclude<Category, "random">, string[]> = {
  sports: SPORTS,
  countries: COUNTRIES,
  objects: OBJECTS,
  places: PLACES,
  animals: ANIMALS,
  transport: TRANSPORT,
  technology: TECH,
  science: SCIENCE,
};

/** Fallback when DB + wordbank.generated.json are empty */
export const embeddedWordBank: Record<Exclude<Category, "random">, string[]> = BY_CAT;
