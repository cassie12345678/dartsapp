import { DartScore, scoreFromHit } from "./darts";

export type BoardCalibration = {
  calibrated: boolean;
  centerX: number;
  centerY: number;
  radius: number;
  rotationDeg: number;
};

export type VisionResult = {
  dart?: DartScore;
  confidence: number;
  debugLabel: string;
};

/**
 * Productielaag:
 * - Gebruik OpenCV.js voor board detectie: Hough circles, ellipse fitting, perspective correction.
 * - Gebruik frame differencing / optical flow voor nieuwe dartdetectie.
 * - Zet pixelpositie om naar polaire coördinaten t.o.v. gekalibreerd bord.
 * - Bepaal ring: miss, single, triple, double, bull.
 * - Bepaal sector via hoek + bordrotatie.
 *
 * Deze starter bevat een veilige mock-detectie zodat de gameflow direct werkt.
 */
export function mockDetectDart(): VisionResult {
  const sectors = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const r = Math.random();

  if (r < 0.08) return { dart: scoreFromHit("MISS"), confidence: 0.71, debugLabel: "miss" };
  if (r < 0.12) return { dart: scoreFromHit("BULL"), confidence: 0.79, debugLabel: "bull" };

  const number = sectors[Math.floor(Math.random() * sectors.length)];
  const type = r > 0.86 ? "T" : r > 0.72 ? "D" : "S";
  const dart = scoreFromHit(type as any, number);
  return { dart, confidence: 0.65 + Math.random() * 0.28, debugLabel: dart.label };
}

export function defaultCalibration(): BoardCalibration {
  return {
    calibrated: false,
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.42,
    rotationDeg: 0
  };
}
