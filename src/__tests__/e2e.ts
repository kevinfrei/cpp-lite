import { promises as fsp, mkdirSync } from 'fs';
import { rimraf } from 'rimraf';
import { Main } from '../index';

const dumb = 'src/__tests__/files/dumb.txt';
const dumbOut = 'src/__tests__/results/output.txt';

beforeAll(() => {
  rimraf.sync('src/__tests__/results');
  mkdirSync('src/__tests__/results');
});

afterAll(() => {
  rimraf.sync('src/__tests__/results');
});

test('dumb cat', async () => {
  await Main([dumb, '-o', dumbOut]);
  const dumbin = await fsp.readFile(dumb);
  const dumbout = await fsp.readFile(dumbOut);
  expect(dumbin).toEqual(dumbout);
});
