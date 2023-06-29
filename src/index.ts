import { PluginOption } from "vite";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

function timeZoneOffset(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

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
  /**
   * Path prefix for the files included in the zip file
   * @default ``
   */
  pathPrefix?: string;
}

export default function zipPack(options?: Options): PluginOption {
  const inDir = options?.inDir || "dist";
  const outDir = options?.outDir || "dist-zip";
  const outFileName = options?.outFileName || "dist.zip";
  const pathPrefix = options?.pathPrefix || '';

  function addFilesToZipArchive(zip: JSZip | null, inDir: string) {
    const listOfFiles = fs.readdirSync(inDir);

    listOfFiles.forEach((fileName) => {
      const filePath = path.join(inDir, fileName);
      const file = fs.statSync(filePath);
      const timeZoneOffsetDate = timeZoneOffset(new Date(file.mtime));

      if (file?.isDirectory()) {
        zip!.file(fileName, null, {
          dir: true,
          date: timeZoneOffsetDate
        });
        const dir = zip!.folder(fileName);

        addFilesToZipArchive(dir, filePath);
      } else {

        zip!.file(fileName, fs.readFileSync(filePath), { date: timeZoneOffsetDate });
      }
    });
  }

  function createZipArchive(zip: JSZip | null) {
    // @ts-ignore
    zip.root = '';

    zip!
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

          if (pathPrefix && path.isAbsolute(pathPrefix)) {
            throw new Error('"pathPrefix" must be a relative path');
          }

          const zip = new JSZip();
          let archive;

          if (pathPrefix) {
            const timeZoneOffsetDate = timeZoneOffset(new Date());

            zip!.file(pathPrefix, null, {
              dir: true,
              date: timeZoneOffsetDate
            });
            archive = zip!.folder(pathPrefix);
          } else {
            archive = zip;
          }

          console.log("\x1b[32m%s\x1b[0m", "  - Preparing files.");
          addFilesToZipArchive(archive, inDir);

          console.log("\x1b[32m%s\x1b[0m", "  - Creating zip archive.");
          createZipArchive(archive);

          console.log("\x1b[32m%s\x1b[0m", "  - Done.");
        } else {
          console.log(
            "\x1b[31m%s\x1b[0m",
            `  - "${inDir}" folder does not exist!`
          );
        }
      } catch (error) {
        if (error) {
          console.log(
            "\x1b[31m%s\x1b[0m",
            `  - ${error}`
          );
        }

        console.log(
          "\x1b[31m%s\x1b[0m",
          "  - Something went wrong while building zip file!"
        );
      }
    },
  };
}
