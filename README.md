# vite-plugin-zip-pack
[![npm](https://img.shields.io/npm/v/vite-plugin-zip-pack)](https://www.npmjs.com/package/vite-plugin-zip-pack)

Vite plugin for packing distribution/build folder into a zip file.

## Install

```bash
npm i -D vite-plugin-zip-pack
```

## Usage

```ts
// vite.config.js

import { defineConfig } from "vite";
import zipPack from "vite-plugin-zip-pack";

export default defineConfig({
  plugins: [zipPack()],
});
```

## Options

```ts
export interface Options {
  /**
   * Input Directory
   * @default `dist`
   */
  inDir?: string;
  /**
   * Output Directory
   * @default `dist-zip`
   */
  outDir?: string;
  /**
   * Zip Archive Name
   * @default `dist.zip`
   */
  outFileName?: string;
}
```
## License

MIT, see [the license file](./LICENSE)