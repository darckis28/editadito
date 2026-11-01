import assert from 'node:assert/strict';
import {centerRect} from '../src/components/snap.js';
const r=[20,30,120,70],b=[10,20,610,820];
assert.deepEqual(centerRect(r,b,'horizontal'),[260,30,360,70]);
assert.deepEqual(centerRect(r,b,'vertical'),[20,400,120,440]);
assert.deepEqual(centerRect(r,b,'both'),[260,400,360,440]);
assert.deepEqual(r,[20,30,120,70]);
console.log('PASS centering on each axis preserves dimensions and the other coordinate.');
