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
interface INestedDiff {
  readonly diff: boolean;
  readonly nested: true;
  readonly internal: Record<string, Change>;
}
interface IStringDiff extends IValueDiff {
  strDiff?: DiffChange[];
}
interface IArrayDiff {
  readonly diff: boolean;
  readonly nested: true;
  readonly internal: Change[];
}

export class Diff<T,U> {
  constructor(
    public readonly obj1: T,
    public readonly obj2: U
  ) { }

  static compare<R,S>(obj1:R, obj2: S) {
    return diff(obj1, obj2);
  }
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
  get [Symbol.toStringTag]() { return 'StringDiff'; }

  protected _cachedDiff: DiffChange[] | null = null

  get strDiff() {
    this._cachedDiff ??= diffChars(this.__old, this.__new);
    return this._cachedDiff;
  }
}
export class ObjectDiff extends Diff<any, any> implements INestedDiff {

  get [Symbol.toStringTag]() { return 'NestedDiff'; }

  readonly nested = true;

  protected _cachedDiffValue: INestedDiff['diff'] | null = null;
  get diff() {
    if (this._cachedDiffValue === null) this.calcDeps()
    return this._cachedDiffValue!;
  };

  protected _cachedInternal: INestedDiff['internal'] | null = null;
  get internal() {
    if (this._cachedInternal === null) this.calcDeps()
    return this._cachedInternal!;
  }

  protected calcDeps() {
    const a = Object.keys(this.obj1)
      .concat(Object.keys(this.obj2))
      .filter((item, index, self) => self.indexOf(item) === index)
      .map(key => [key, diff(this.obj1[key], this.obj2[key])]) as [string, Change][]

    this._cachedDiffValue = !!a.find(([_, value]) => value.diff)

    this._cachedInternal = Object.fromEntries(a);
  }
}
export class ArrayDiff extends Diff<any, any> implements IArrayDiff {
  get [Symbol.toStringTag]() { return 'ArrayDiff'; }

  readonly nested = true

  protected _cachedDiffValue: INestedDiff['diff'] | null = null;
  get diff() {
    if (this._cachedDiffValue === null) this.calcDeps()
    return this._cachedDiffValue!;
  };

  protected _cachedDiff: IArrayDiff['internal'] | null = null;
  get internal() {
    if (this._cachedDiff === null) this.calcDeps()

    return this._cachedDiff!;
  }

  protected calcDeps() {
    const diffArray: Change[] = []
    // console.debug( this.obj1, this.obj2, )
    for (let i = 0; i < Math.max(this.obj1.length, this.obj2.length); i++) {
      const df = diff(
        this.obj1.length > i ? this.obj1[i] : null,
        this.obj2.length > i ? this.obj2[i] : null,
      );
      // console.debug( df )
      diffArray.push(df);

      this._cachedDiffValue ||= df.diff
    }
    this._cachedDiff =  diffArray;
  }
}

export type Change<T = any> =
  | NoDiff<T>
  | ValueDiff<any, any>
  | ObjectDiff
  | StringDiff
  | ArrayDiff

function diff(obj1: any, obj2: any): Change {
  let df: Change;

  if (Object.is(obj1, obj2)) {
    df = new NoDiff(obj1, obj2)
  } else if (typeof obj1 !== typeof obj2) {
    df = new ValueDiff(obj1, obj2)
  } else {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      df = new ArrayDiff(obj1, obj2);
      // df = new ArrayDiff(obj1, obj2.map(s => s.substring(1)+'x'));
    } else if (Array.isArray(obj1) || Array.isArray(obj2) || obj1 === null || obj2 === null) {
      df = new ValueDiff(obj1, obj2);
    } else if (typeof obj1 === 'object') {
      df = new ObjectDiff(obj1, obj2);
    } else if (typeof obj1 === 'string') {
      df = new StringDiff(obj1, obj2);
    } else {
      df = new ValueDiff(obj1, obj2);
    }
  }

  return df;
}
