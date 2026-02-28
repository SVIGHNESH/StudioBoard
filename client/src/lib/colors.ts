export const userColors = [
  "#E85D3D",
  "#2D8C8C",
  "#D9A441",
  "#7A56A8",
  "#3178C6",
  "#C44F6B",
  "#3F8E6D",
  "#B86F2E",
];

export const pickUserColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % userColors.length;
  return userColors[index];
};
