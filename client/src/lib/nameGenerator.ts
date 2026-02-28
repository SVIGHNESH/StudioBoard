const adjectives = [
  "Coral",
  "Swift",
  "Amber",
  "Crimson",
  "Golden",
  "Silver",
  "Jade",
  "Ivory",
  "Scarlet",
  "Azure",
  "Copper",
  "Sage",
  "Rustic",
  "Velvet",
  "Onyx",
];

const animals = [
  "Penguin",
  "Falcon",
  "Fox",
  "Owl",
  "Bear",
  "Wolf",
  "Deer",
  "Hawk",
  "Crane",
  "Raven",
  "Otter",
  "Lynx",
  "Heron",
  "Badger",
  "Sparrow",
];

export const generateName = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective} ${animal}`;
};
