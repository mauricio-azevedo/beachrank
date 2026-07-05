// A group's visual identity: initials derive from the name, the stable tint from the
// id. Single source for every group monogram (see components/ui/group-avatar.tsx).

export function getGroupInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

// Deterministic hue (0-360) from a group id, so each group's tint is stable.
export function hueFromId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 360;
  }
  return hash;
}

// The canonical per-group gradient (the home mock's values — every hue surface
// converges here so the same group wears the same color everywhere).
export function groupHueGradient(seed: string): string {
  const hue = hueFromId(seed);
  return `linear-gradient(150deg, oklch(65% 0.15 ${hue}), oklch(58% 0.15 ${hue}))`;
}
