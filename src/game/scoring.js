export function calculateScoreHit({ dx, dy, maxRadius, rings }) {
  const distance = Math.sqrt((dx * dx) + (dy * dy));
  const outerMost = rings[0]?.[0] ?? 1;
  if (distance > outerMost * maxRadius) {
    return { pts: 0, label: 'Daneben!', isX: false };
  }

  let ringIdx = 0;
  for (let i = rings.length - 1; i >= 0; i--) {
    if (distance <= rings[i][0] * maxRadius) {
      ringIdx = i;
      break;
    }
  }

  const ring = rings[ringIdx];
  const basePts = ring[3];
  const outerR = ring[0] * maxRadius;
  const innerR = ringIdx + 1 < rings.length ? rings[ringIdx + 1][0] * maxRadius : 0;
  const ringWidth = outerR - innerR;
  const posInRing = ringWidth > 0 ? (outerR - distance) / ringWidth : 1;
  const pts = Math.round(Math.min(10.9, basePts + (posInRing * 0.9)) * 10) / 10;

  const xRadius = (rings[9]?.[0] || 0.1) * maxRadius * 0.5;
  const isX = basePts === 10 && distance <= xRadius;
  const label = isX ? '✦ Innenzehner (X)' : (ring[4] || `Ring ${basePts}`);

  return { pts, label, isX };
}

export const Scoring = { calculateScoreHit };
