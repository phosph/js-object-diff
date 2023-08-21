import { Change as DiffChange, diffChars } from 'diff';

interface INoDiff {
  readonly diff: false;
  value: any;
}
interface IValueDiff {
  readonly diff: true;
  __old: any;
  __new: any;
}
interface INestedDiff<T, U> {
  readonly diff: boolean;
  readonly nested: true;
  readonly internal: Record<string, Diff<T, U>>;
}
interface IStringDiff extends IValueDiff {
  strDiff: DiffChange[];
}
interface IArrayDiff {
  readonly diff: boolean;
  readonly nested: true;
  readonly internal: Diff<any, any>[];
}

export class JsonPath extends Array<string | number> {
  #jsonPathCache: string | null = null;
  toJsonPath(): string {
    if (this.#jsonPathCache !== null) return this.#jsonPathCache;

    let path = '$';
    for (const key of this) {
      if (typeof key === 'number') path += `[${key}]`;
      else path += `.${key}`;
    }

    this.#jsonPathCache = path;
    return path;
  }

  toString(): string {
    return this.toJsonPath();
  }

  [Symbol.toPrimitive](hint: "number" | "string" | "default") {
    if (hint === 'number') return this.length;
    return this.toString();
  }

  static from(iterable: Iterable<string | number> | ArrayLike<string | number>) {
    const instance = new JsonPath()

    if (Symbol.iterator in iterable) for (const item of iterable) instance.push(item)
    else for (let i = 0; i < iterable.length; i++) instance.push(iterable[i])

    return instance;
  }

}

export abstract class Diff<T = any, U = any> {
  constructor(
    public readonly obj1: T,
    public readonly obj2: U
  ) { }

  static compare<R, S>(obj1: R, obj2: S) {
    return compare<R, S>(obj1, obj2);
  }
  abstract readonly diff: any
}

export class NoDiff<T> extends Diff<T, T> implements INoDiff {
  readonly diff = false;

  constructor(obj1: T, obj2: T) {
    if (!Object.is(obj1, obj2)) throw new TypeError('are not the same')
    super(obj1, obj2);
  }

  get [Symbol.toStringTag]() { return 'NoDiff'; }

  get value() { return this.obj1 }
}

export class ValueDiff<T, U> extends Diff<T, U> implements IValueDiff {
  get [Symbol.toStringTag]() { return 'ValueDiff'; }

  constructor(obj1: T, obj2: U) {
    if (Object.is(obj1, obj2)) throw new TypeError('are he same')
    super(obj1, obj2);
  }

  readonly diff = true;
  get __old() { return this.obj1 }
  get __new() { return this.obj2 }
}

export class StringDiff extends ValueDiff<string, string> implements IStringDiff {
  get [Symbol.toStringTag]() {
    return 'StringDiff';
  }

  protected _cachedDiff: DiffChange[] | null = null;

  get strDiff() {
    this._cachedDiff ??= diffChars(this.__old, this.__new) || null;
    return this._cachedDiff!;
  }
}

export class ObjectDiff<T extends Record<string, any>, U extends Record<string, any>> extends Diff<T, U> implements INestedDiff<T, U> {

  get [Symbol.toStringTag]() { return 'NestedDiff'; }

  readonly nested = true;

  protected _cachedDiffValue: INestedDiff<T, U>['diff'] | null = null;
  get diff() {
    if (this._cachedDiffValue === null) this.calcDeps()
    return this._cachedDiffValue!;
  };

  protected _cachedInternal: INestedDiff<T, U>['internal'] | null = null;
  get internal() {
    if (this._cachedInternal === null) this.calcDeps()
    return this._cachedInternal!;
  }

  protected calcDeps() {
    const keys = new Set([
      ...Object.keys(this.obj1),
      ...Object.keys(this.obj2),
    ]);

    const diffs: [keys: string, diff: Diff][] = []

    for (let key of keys) {
      const _diff = compare(this.obj1[key], this.obj2[key]);
      diffs.push([key, _diff]);

      if (_diff.diff) this._cachedDiffValue ||= true
    }

    this._cachedInternal = Object.freeze(Object.fromEntries(diffs));
  }

  #flatCache: [JsonPath, Diff][] | null = null
  get flat() {
    this.#flatCache ??= this.#toFlat();
    return this.#flatCache;
  }

  #toFlat({ internal }: ObjectDiff<T, U> = this): [JsonPath, Diff][] {
    const keys = Object.keys(internal).sort((a, b) => a.localeCompare(b)) as (keyof typeof internal)[];

    const flat: [JsonPath, Diff][] = []

    for (const key of keys) {
      const obj = internal[key]

      if (obj instanceof ObjectDiff || obj instanceof ArrayDiff) {
        for (const [_path, _lasDiff] of obj.flat) {
          flat.push([JsonPath.from([key, ..._path]), _lasDiff]);
        }
      } else {
        flat.push([JsonPath.from([key]), obj]);
      }
    }

    return flat;
  }

}


export class ArrayDiff extends Diff<any, any> implements IArrayDiff {
  get [Symbol.toStringTag]() { return 'ArrayDiff'; }

  readonly nested = true

  #cachedDiffValue: INestedDiff<any, any>['diff'] | null = null;
  get diff(): boolean {
    if (this.#cachedDiffValue === null) this._calcDeps()
    return this.#cachedDiffValue!;
  };

  #cachedDiff: IArrayDiff['internal'] | null = null;
  get internal() {
    if (this.#cachedDiff === null) this._calcDeps()
    return this.#cachedDiff!;
  }

  protected _calcDeps() {
    const diffArray: Diff[] = []
    for (let i = 0; i < Math.max(this.obj1.length, this.obj2.length); i++) {
      const df = compare(
        this.obj1.length > i ? this.obj1[i] : undefined,
        this.obj2.length > i ? this.obj2[i] : undefined,
      );
      diffArray.push(df);
      this.#cachedDiffValue ||= !!df.diff
    }
    this.#cachedDiff = diffArray;
    if (this.#cachedDiffValue === null) this.#cachedDiffValue = false
  }

  #flatCache: [JsonPath, Diff][] | null = null
  get flat() {
    this.#flatCache ??= this.#toFlat();
    return this.#flatCache;
  }

  #toFlat({ internal }: ArrayDiff = this): [JsonPath, Diff][] {
    let flat: [JsonPath, Diff][] = [];

    for (let i = 0; i < internal.length; i++) {
      const obj = internal[i];

      if (obj instanceof ObjectDiff || obj instanceof ArrayDiff) {
        for (const [_path, _lasDiff] of obj.flat) {
          flat.push([JsonPath.from([i, ..._path]), _lasDiff]);
        }
      } else {
        flat.push([JsonPath.from([i]), obj]);
      }
    }

    return flat;
  }
}


export function compare<T extends unknown[], U extends unknown[]>(obj1: T, obj2: U): ArrayDiff
export function compare<T extends string, U extends string>(obj1: T, obj2: U): StringDiff
export function compare<T extends Record<string | number, unknown>, U extends Record<string | number, unknown>>(obj1: T, obj2: U): ObjectDiff<T, U>
export function compare<T>(obj1: T, obj2: T): NoDiff<T> | ValueDiff<T, T>
export function compare<T extends any, U extends any>(obj1: T, obj2: U): Diff<T, U>
// export interface diff {
//   <T>(obj1: T, obj2: T): NoDiff<T>
//   <T extends unknown[], U extends unknown[]>(obj1: T, obj2: U): ArrayDiff
//   <T extends string, U extends string>(obj1: T, obj2: U): StringDiff
//   <T extends Record<string | number, unknown>, U extends Record<string | number, unknown>>(obj1: T, obj2: U): ObjectDiff<T, U>
//   <T extends unknown, U extends unknown>(obj1: T, obj2: U): ValueDiff<T, U>
// }

export function compare<T, U>(obj1: T, obj2: U): Diff<T, U> {
  let df: Diff;

  if (Object.is(obj1, obj2)) {
    df = new NoDiff<T>(obj1, (obj2 as unknown) as T)
  } else if (typeof obj1 === typeof obj2) {
    const type = typeof obj1

    if (type === 'string') {
      df = new StringDiff(obj1 as string, obj2 as string);
    } else if (type === 'object' && obj1 !== null && obj2 !== null) {
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        df = new ArrayDiff(obj1, obj2);
      } else if (!Array.isArray(obj1) && !Array.isArray(obj2)) {
        df = new ObjectDiff(obj1 as any, obj2 as any);
      }
    }
  }

  df ??= new ValueDiff(obj1, obj2);

  return df;
}
