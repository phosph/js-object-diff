import { Diff, NoDiff, ValueDiff, StringDiff, ObjectDiff, ArrayDiff } from './main';

// TODO: tests

describe('object diff test', () => {
  it('Diff.compare(null,null)', () => {
    const a = null
    const b = null
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('Diff.compare(1,1)', () => {
    const a = 1
    const b = 1
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('Diff.compare("", "")', () => {
    const a = ''
    const b = ''
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('Diff.compare(undefined,undefined)', () => {
    const a = undefined
    const b = undefined
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(NoDiff)
  })
  it('Diff.compare(Number,Number)', () => {
    const a = Math.random()
    const b = Math.random()
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ValueDiff)
    expect(result.diff).toBe(true)
    expect((result as ValueDiff<any, any>).__old).toBe(a)
    expect((result as ValueDiff<any, any>).__new).toBe(b)
  })
  it('Diff.compare("a","b")', () => {
    const a = 'a'
    const b = 'b'
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(StringDiff)
    expect(result.diff).toBe(true)
    expect((result as StringDiff).__old).toBe(a)
    expect((result as StringDiff).__new).toBe(b)
    expect((result as StringDiff).strDiff).toBeInstanceOf(Array) // TODO, better thes
  })
  it('Diff.compare({},{})', () => {
    const a = {}
    const b = {}
    const result = Diff.compare(a, b);
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ObjectDiff)
    expect(result.diff).not.toBeTruthy()


    expect((result as ObjectDiff<{},{}>).nested).toBeTruthy()
    expect((result as ObjectDiff<{},{}>).internal).toBeInstanceOf(Object);
    expect((result as ObjectDiff<{},{}>).internal).not.toBeNull()
    expect((result as ObjectDiff<{},{}>).internal).not.toBeInstanceOf(Array);
    for (let val of Object.values((result as ObjectDiff<{},{}>).internal)) {
      expect(val).toBeInstanceOf(Diff);
    }
  })
  it('Diff.compare([],[])', () => {
    const a = [] as any[]
    const b = [] as any[]
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ArrayDiff)
    expect(result.diff).not.toBeTruthy()
    expect((result as ArrayDiff).nested).toBeTruthy()
    expect((result as ArrayDiff).internal).toBeInstanceOf(Array)
    for(let val of (result as ArrayDiff).internal) {
      expect(val).toBeInstanceOf(Diff)
    }
  })
  it('Diff.compare([],{})', () => {
    const a = []
    const b = {}
    const result = Diff.compare(a,b)
    expect(result).toBeInstanceOf(Diff)
    expect(result).toBeInstanceOf(ValueDiff)
    expect(result.diff).toBeTruthy()
    expect((result as ValueDiff<any, any>).__old).toBe(a)
    expect((result as ValueDiff<any, any>).__new).toBe(b)
  })
})
