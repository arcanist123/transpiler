import {DecFloat34} from "./decfloat34";
import {throwError} from "../throw_error";
import {Decimal, roundSignificant} from "./_decimal";

/** decfloat16 has 16 significant digits */
export const DECFLOAT16_PRECISION = 16;
/** the largest decfloat16 is 9.999999999999999E384 */
const MAX_EXPONENT = 384;
/** the last digit of a decfloat16 is at most at 1E-398, the smallest subnormal */
const MAX_SCALE = 398;

/** A calculation with a decfloat16 operand is expected to run in decfloat34, the result is
 * rounded to 16 significant digits, half away from zero, when it is stored in the field */
export class DecFloat16 extends DecFloat34 {

  public clone(): DecFloat16 {
    const n = new DecFloat16();
    n.setDecimal(this.getDecimal());
    return n;
  }

  public set(value: Parameters<DecFloat34["set"]>[0]) {
    const previous = this.getDecimal();
    super.set(value);
    try {
      this.setDecimal(this.getDecimal());
    } catch (e) {
      // the field keeps its value when the new one does not fit
      super.setDecimal(previous);
      throw e;
    }
    return this;
  }

  public setDecimal(value: Decimal): DecFloat16 {
    const digits = value.digits < 0n ? (-value.digits).toString().length : value.digits.toString().length;
    // below 1E-383 fewer digits are left, as far as 1E-398, a smaller value is rounded to 0
    const precision = Math.min(DECFLOAT16_PRECISION, digits - (value.scale - MAX_SCALE));
    const rounded = roundSignificant(value, precision);
    if (rounded.digits !== 0n) {
      const length = rounded.digits < 0n ? (-rounded.digits).toString().length : rounded.digits.toString().length;
      if (length - 1 - rounded.scale > MAX_EXPONENT) {
        throwError("CX_SY_CONVERSION_OVERFLOW");
      }
    }
    super.setDecimal(rounded);
    return this;
  }
}
