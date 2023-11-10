import fs, { promises as fsp } from 'fs';
import { rimraf } from 'rimraf';
import { MainAsync } from '../index';
import { FileUtil } from '@freik/node-utils';

const dumb = 'src/__tests__/files/dumb.txt';
const dumbOut = 'src/__tests__/results/output.txt';

beforeAll(async () => {
  await rimraf('src/__tests__/results');
  await fsp.mkdir('src/__tests__/results');
});

afterAll(() => {
  // rimraf.sync('src/__tests__/results');
});

test('dumb cat', async () => {
  await MainAsync([dumb, '-o', dumbOut]);
  const dumbin = await FileUtil.textFileToArrayAsync(dumb);
  const dumbout = await FileUtil.textFileToArrayAsync(dumbOut);
  // await new Promise(process.nextTick);
  expect(dumbin.join("**")).toEqual(dumbout.join("**"));
});
