import fs from "fs-extra";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const copyAssets = () => {
  fs.ensureDir(__dirname + "/../dist/", (err) => {
    if (err) return console.log(err);

    fs.copy(__dirname + "/../assets", __dirname + "/../dist/assets", (err) => {
      if (err) return console.error(err);
      console.log(">>> Phaser assets copied!");
    });
  });
};

copyAssets();
