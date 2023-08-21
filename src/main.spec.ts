import { ArrayDiff, Diff, JsonPath, NoDiff, ObjectDiff, StringDiff, ValueDiff, compare } from './main';

describe('object diff test', () => {
  it('compare(null,null)', () => {
    const a = null
    const b = null
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('compare(1,1)', () => {
    const a = 1
    const b = 1
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('compare("", "")', () => {
    const a = ''
    const b = ''
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('compare(undefined,undefined)', () => {
    const a = undefined
    const b = undefined
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('compare(Number,Number)', () => {
    const a = Math.random()
    const b = Math.random()
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ValueDiff)
    expect(result.diff).toBe(true)
    expect((result as ValueDiff<any, any>).__old).toBe(a)
    expect((result as ValueDiff<any, any>).__new).toBe(b)
  })
  it('compare("a","b")', () => {
    const a = 'a'
    const b = 'b'
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(StringDiff)
    expect(result.diff).toBe(true)
    expect(result.__old).toBe(a)
    expect(result.__new).toBe(b)
    expect(result.strDiff).toBeInstanceOf(Array) // TODO, better thes
  })
  it('compare({},{})', () => {
    const a = {}
    const b = {}
    const result = compare(a, b);
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ObjectDiff)
    expect(result.diff).not.toBeTruthy()


    expect(result.nested).toBeTruthy()
    expect(result.internal).toBeInstanceOf(Object);
    expect(result.internal).not.toBeNull()
    expect(result.internal).not.toBeInstanceOf(Array);
    for (let val of Object.values(result.internal)) {
      expect(val).toBeInstanceOf(Diff);
    }
  })
  it('compare([],[])', () => {
    const a = [] as any[]
    const b = [] as any[]
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ArrayDiff)
    expect(result.diff).not.toBeTruthy()
    expect(result.nested).toBeTruthy()
    expect(result.internal).toBeInstanceOf(Array)
    for (let val of result.internal) {
      expect(val).toBeInstanceOf(Diff)
    }
  })
  it('compare([],{})', () => {
    const a: any[] = []
    const b = {}
    const result = compare(a, b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ValueDiff)
    expect(result.diff).toBeTruthy()
    expect((result as ValueDiff<any, any>).__old).toBe(a)
    expect((result as ValueDiff<any, any>).__new).toBe(b)
  })
})

describe('radom Comparition', () => {
  const ramdon = ['afaerg', Math.random() * (Math.random() * 4 | 0), null, undefined, {}, [], 'ñlaieurgnv', Math.random()]

  for (const obj1 of ramdon) {
    const obj2 = ramdon[Math.random() * 23 % ramdon.length];

    const str1 = typeof obj1 === 'string' ? `"${obj1}"`
      : Array.isArray(obj1) ? '[]'
        : (typeof obj1 === 'object' && obj1 !== null) ? '{}'
          : obj1
    const str2 = typeof obj2 === 'string' ? `"${obj2}"`
      : Array.isArray(obj2) ? '[]'
        : (typeof obj2 === 'object' && obj2 !== null) ? '{}'
          : obj2

    it(`compare(${str1}, ${str2})`, () => {
        const diff = compare(obj1, obj2);
        if (obj1 === obj2) {
          expect(diff).toBeInstanceOf(NoDiff);
        } else if (typeof obj1 !== typeof obj2) {
          expect(diff).toBeInstanceOf(ValueDiff);
        } else if (Array.isArray(obj1)) {
          expect(diff).toBeInstanceOf(ArrayDiff);
        } else if (obj1 === null) {
          expect(diff).toBeInstanceOf(ValueDiff);
        } else if (typeof obj1 === 'object') {
          expect(diff).toBeInstanceOf(ObjectDiff);
        }
      })
  }

})


describe('ObjectDiff.flat', () => {
  const obj1 = { a: 'hello', c: 'hello', d: [{ word: 'hello' }] }
  const obj2 = { b: 'world', c: 'world', d: [{ word: 'world' }] }
  const diff = compare(obj1, obj2);

  it('instanceof ObjectDiff', () => {
    expect(diff).toBeInstanceOf(ObjectDiff);
    expect(diff.diff).toBeTruthy();
  });

  it('flat', () => {
    console.time('ObjectDiff.flat contruction')
    const flat = diff.flat;
    console.timeEnd('ObjectDiff.flat contruction')
    expect(flat).toBeInstanceOf(Array)
    expect(flat).toHaveLength(4)
    for (const item of flat) {
      expect(item).toBeInstanceOf(Array)
      expect(item).toHaveLength(2)
      expect(item[0]).toBeInstanceOf(JsonPath)
      expect(item[1]).toBeInstanceOf(Diff)
    }
  })

  it('flat[0]', () => {
    const [path, _diff] = diff.flat[0]
    expect(path.toString()).toBe('$.a')
    expect(_diff).toBeInstanceOf(ValueDiff)
  })

  it('flat[1]', () => {
    const [path, _diff] = diff.flat[1]
    expect(path.toString()).toBe('$.b')
    expect(_diff).toBeInstanceOf(ValueDiff)
  })

  it('flat[2]', () => {
    const [path, _diff] = diff.flat[2]
    expect(path.toString()).toBe('$.c')
    expect(_diff).toBeInstanceOf(StringDiff)
  })
  it('flat[3]', () => {
    const [path, _diff] = diff.flat[3]
    expect(path.toString()).toBe('$.d[0].word')
    expect(_diff).toBeInstanceOf(StringDiff)
  })
})
describe('ArrayDiff.flat', () => {
  const obj1 = ['hello', [{ word: 'hello' }]];
  const obj2 = ['world', [{ word: 'world' }]];
  const diff = compare(obj1, obj2);

  it('instanceof ArrayDiff', () => {
    expect(diff).toBeInstanceOf(ArrayDiff);
    expect(diff.diff).toBeTruthy();
  });

  it('flat', () => {
    console.time('ArrayDiff.flat contruction')
    const flat = diff.flat;
    console.timeEnd('ArrayDiff.flat contruction')
    expect(flat).toBeInstanceOf(Array)
    expect(flat).toHaveLength(2)
    for (const item of flat) {
      expect(item).toBeInstanceOf(Array)
      expect(item).toHaveLength(2)
      expect(item[0]).toBeInstanceOf(JsonPath)
      expect(item[1]).toBeInstanceOf(Diff)
    }
  })

  it('flat[0]', () => {
    const [path, _diff] = diff.flat[0]
    expect(path.toString()).toBe('$[0]')
    expect(_diff).toBeInstanceOf(StringDiff)
  })

  it('flat[1]', () => {
    const [path, _diff] = diff.flat[1]
    expect(path.toString()).toBe('$[1][0].word')
    expect(_diff).toBeInstanceOf(StringDiff)
  })
})

describe('JsonPath', () => {
  const path = [1, 0, 'word']
  const instance = JsonPath.from(path);
  it('JsonPath', () => {
    expect(instance).toBeInstanceOf(JsonPath);
    expect(instance).toHaveLength(3);
    expect(instance).toMatchObject(path);
  })

  it('Symbol.toPrimitive', () => {
    expect(instance.toString()).toBe(`$[${path[0]}][${path[1]}].${path[2]}`);
    expect(`${instance}`).toBe(`$[${path[0]}][${path[1]}].${path[2]}`);
    expect(+instance).toBe(instance.length);
  })
})