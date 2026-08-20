/**
 * Valve Source Engine CUniformRandomStream (Numerical Recipes ran1).
 *
 * Formula / constants from Step7750's port of the Source SDK, which is the
 * generator the 2016 paint-seed PSA identified as driving pattern UV:
 *   https://www.reddit.com/r/GlobalOffensiveTrade/comments/b7g538/psa_how_paint_seed_actually_works_technical/
 *   https://github.com/Step7750/UniformRandom/blob/master/random.go
 *
 * Same algorithm is used by the community fade calculators and by
 * isitabluegem's seed → transform pipeline:
 *   https://www.isitabluegem.com/insights
 *   https://www.isitabluegem.com/zh-CN/insights
 */

const NTAB = 32;
const IA = 16807;
const IM = 2147483647;
const IQ = 127773;
const IR = 2836;
const NDIV = 1 + Math.trunc((IM - 1) / NTAB);
const AM = 1.0 / IM;
const RNMX = 1.0 - 1.2e-7;

export class UniformRandomStream {
  private mIdum = 0;
  private mIy = 0;
  private readonly mIv: number[] = Array.from({ length: NTAB }, () => 0);

  setSeed(iSeed: number): void {
    // Source: SetSeed stores a negative idum so the first GenerateRandomNumber
    // re-tables. Seed 0 and seed 1 both collapse to idum=1 — documented Valve
    // quirk (pattern.wiki publishes identical offsets for AK Case Hardened #0/#1).
    this.mIdum = iSeed >= 0 ? -iSeed : iSeed;
    this.mIy = 0;
  }

  generateRandomNumber(): number {
    let j: number;
    let k: number;

    if (this.mIdum <= 0 || this.mIy === 0) {
      this.mIdum = -this.mIdum < 1 ? 1 : -this.mIdum;
      for (j = NTAB + 7; j >= 0; j--) {
        k = Math.trunc(this.mIdum / IQ);
        this.mIdum = Math.trunc(IA * (this.mIdum - k * IQ) - IR * k);
        if (this.mIdum < 0) this.mIdum += IM;
        if (j < NTAB) this.mIv[j] = this.mIdum;
      }
      this.mIy = this.mIv[0];
    }

    k = Math.trunc(this.mIdum / IQ);
    this.mIdum = Math.trunc(IA * (this.mIdum - k * IQ) - IR * k);
    if (this.mIdum < 0) this.mIdum += IM;
    j = Math.trunc(this.mIy / NDIV);
    this.mIy = this.mIv[j];
    this.mIv[j] = this.mIdum;
    return this.mIy;
  }

  /** Uniform float in [low, high). Matches Valve RandomFloat. */
  randomFloat(low: number, high: number): number {
    let fl = AM * this.generateRandomNumber();
    if (fl > RNMX) fl = RNMX;
    return fl * (high - low) + low;
  }
}
