import { diffChars, Change as DiffChange } from 'diff';

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

export abstract class Diff<T = any,U = any> {
  constructor(
    public readonly obj1: T,
    public readonly obj2: U
  ) { }

  static compare<R,S>(obj1:R, obj2: S) {
    return diff<R,S>(obj1, obj2);
  }
  abstract readonly diff: any
}
export class NoDiff<T> extends Diff<T,T> implements INoDiff {
  readonly diff = false;

  constructor(obj1: T, obj2: T) {
    if (!Object.is(obj1, obj2)) throw new TypeError('are not the same')
    super(obj1, obj2)
  }

  get [Symbol.toStringTag]() { return 'NoDiff'; }

  get value() { return this.obj1 }
}
export class ValueDiff<T,U> extends Diff<T,U> implements IValueDiff {
  get [Symbol.toStringTag]() { return 'ValueDiff'; }

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

  protected _cachedDiffValue: INestedDiff<T,U>['diff'] | null = null;
  get diff() {
    if (this._cachedDiffValue === null) this.calcDeps()
    return this._cachedDiffValue!;
  };

  protected _cachedInternal: INestedDiff<T,U>['internal'] | null = null;
  get internal() {
    if (this._cachedInternal === null) this.calcDeps()
    return this._cachedInternal!;
  }

  protected calcDeps() {
    const a = Object.keys(this.obj1)
      .concat(Object.keys(this.obj2))
      .filter((item, index, self) => self.indexOf(item) === index)
      .map(key => [key, diff(this.obj1[key], this.obj2[key])]) as [string, Diff][]

    this._cachedDiffValue = !!a.find(([_, value]) => value.diff)

    this._cachedInternal = Object.fromEntries(a);
  }
}
export class ArrayDiff extends Diff<any, any> implements IArrayDiff {
  get [Symbol.toStringTag]() { return 'ArrayDiff'; }

  readonly nested = true

  protected _cachedDiffValue: INestedDiff<any, any>['diff'] | null = null;
  get diff() {
    console.log('diff', this._cachedDiffValue);
    if (this._cachedDiffValue === null) this.calcDeps()
    return this._cachedDiffValue!;
  };

  protected _cachedDiff: IArrayDiff['internal'] | null = null;
  get internal() {
    if (this._cachedDiff === null) this.calcDeps()

    return this._cachedDiff!;
  }

  protected calcDeps() {
    const diffArray: Diff[] = []
    for (let i = 0; i < Math.max(this.obj1.length, this.obj2.length); i++) {
      const df = diff(
        this.obj1.length > i ? this.obj1[i] : null,
        this.obj2.length > i ? this.obj2[i] : null,
      );
      diffArray.push(df);
      this._cachedDiffValue ||= !!df.diff
    }
    this._cachedDiff = diffArray;
    if (this._cachedDiffValue === null) this._cachedDiffValue = false
  }
}


function diff<T,U>(obj1: T, obj2: U): Diff<T,U> {
  let df: Diff;

  if (Object.is(obj1, obj2)) {
    df = new NoDiff<T>(obj1, (obj2 as unknown) as T)
  } else if (typeof obj1 !== typeof obj2) {
    df = new ValueDiff(obj1, obj2)
  } else {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      df = new ArrayDiff(obj1, obj2);
    } else if (Array.isArray(obj1) || Array.isArray(obj2) || obj1 === null || obj2 === null) {
      df = new ValueDiff(obj1, obj2);
    } else if (typeof obj1 === 'object') {
      df = new ObjectDiff(obj1, obj2!);
    } else if (typeof obj1 === 'string' && typeof obj2 === 'string') {
      df = new StringDiff(obj1, obj2);
    } else {
      df = new ValueDiff(obj1, obj2);
    }
  }

  return df;
}
