import {ABAPObject, FieldSymbol, Float, Hex, Structure, Table} from "../types";
import {ICharacter} from "../types/_character";
import {INumeric} from "../types/_numeric";

export function eq(
  left: number | string | ICharacter | INumeric | ABAPObject | Structure | Hex | Table | FieldSymbol,
  right: number | string | ICharacter | INumeric | ABAPObject | Structure | Hex | Table | FieldSymbol): boolean {

  if (left instanceof Table || right instanceof Table) {
    throw "todo, eq TABLE";
  }

  if (right instanceof FieldSymbol) {
    return eq(left, right.getPointer()!);
  } else if (left instanceof FieldSymbol) {
    return eq(left.getPointer()!, right);
  }

  if (left instanceof Structure || right instanceof Structure) {
    if (!(right instanceof Structure)) {
      return false;
    }
    if (!(left instanceof Structure)) {
      return false;
    }
    const l = left.get();
    const r = right.get();
    const leftKeys = Object.keys(l);
    const rightKeys = Object.keys(r);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    for (const k of leftKeys) {
      const e = eq(l[k], r[k]);
      if (e === false) {
        return false;
      }
    }
    return true;
  }

  let l: number | string | undefined = undefined;
  if (typeof left === "object") {
    l = left.get();
  } else {
    l = left;
  }

  let r: number | string | undefined = undefined;
  if (typeof right === "object") {
    r = right.get();
  } else {
    r = right;
  }

  if (right instanceof Hex && typeof l === "number") {
    r = parseInt(right.get(), 16);
  } else if (left instanceof Hex && typeof r === "number") {
    l = parseInt(left.get(), 16);
  }

  if (right instanceof Float && typeof l === "number") {
    r = right.getRaw();
  } else if (left instanceof Float && typeof r === "number") {
    l = left.getRaw();
  }

  // assumption: typically no casts are required, so start checking if the types doesnt match
  if (typeof l !== typeof r) {
    if (typeof l === "string" && typeof r === "number") {
      r = r.toString();
    } else if (typeof l === "number" && typeof r === "string") {
      if (r === "") {
        r = 0;
      } else {
        r = parseInt(r, 10);
      }
    }
  }

  return l === r;
}