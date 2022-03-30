import { PluginOption } from "vite";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

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

export default function zipPack(options?: Options): PluginOption {
  const inDir = options?.inDir || "dist";
  const outDir = options?.outDir || "dist-zip";
  const outFileName = options?.outFileName || "dist.zip";

  function addFilesToZipArchive(zip: JSZip | null, inDir: string) {
    const listOfFiles = fs.readdirSync(inDir);

    listOfFiles.forEach((fileName) => {
      const filePath = path.join(inDir, fileName);
      const file = fs.statSync(filePath);

      if (file?.isDirectory()) {
        const dir = zip!.folder(fileName);
        addFilesToZipArchive(dir, filePath);
      } else {
        zip!.file(fileName, fs.readFileSync(filePath));
      }
    });
  }

  function createZipArchive(zip: JSZip) {
    zip
      .generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9,
        },
      })
      .then((file) => {
        const fileName = path.join(outDir, outFileName);

        if (fs.existsSync(fileName)) {
          fs.unlinkSync(fileName);
        }

        fs.writeFileSync(fileName, file);
      });
  }

  return {
    name: "vite-plugin-zip-pack",
    apply: "build",
    closeBundle() {
      try {
        console.log("\x1b[36m%s\x1b[0m", `Zip packing - "${inDir}" folder :`);
        if (fs.existsSync(inDir)) {
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
          }
          const zip = new JSZip();

          console.log("\x1b[32m%s\x1b[0m", "  - Preparing files.");
          addFilesToZipArchive(zip, inDir);

          console.log("\x1b[32m%s\x1b[0m", "  - Creating zip archive.");
          createZipArchive(zip);

          console.log("\x1b[32m%s\x1b[0m", "  - Done.");
        } else {
          console.log(
            "\x1b[31m%s\x1b[0m",
            `  - "${inDir}" folder does not exist!`
          );
        }
      } catch (error) {
        console.log(
          "\x1b[31m%s\x1b[0m",
          "  - Something went wrong while building zip file!"
        );
      }
    },
  };
}
