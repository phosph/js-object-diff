# @jashitory/js-object-diff [![NPM Package][npm]][npm-url]

[npm]: https://img.shields.io/npm/v/@jashitory/js-object-diff
[npm-url]: https://www.npmjs.com/package/@jashitory/js-object-diff

Get nested Diff between Two objects

## Instaling

`$ npm install @jashitory/js-object-diff`

## Usage

```typescript
import { Diff } from '@jashitory/js-object-diff'

const objA = {...}
const objB = {...}

const diff = Diff.compare(objA, objB);
```