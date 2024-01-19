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
  /**
   * Callback, which is executed after the zip file was created
   * err is only defined if the save function fails
   */
  done?: (err: Error | undefined) => void
}

export default function zipPack(options?: Options): PluginOption {
  const inDir = options?.inDir || "dist";
  const outDir = options?.outDir || "dist-zip";
  const outFileName = options?.outFileName || "dist.zip";
  const pathPrefix = options?.pathPrefix || '';
  const done = options?.done || function (){};

  async function addFilesToZipArchive(zip: JSZip, inDir: string) {
    const listOfFiles = await fs.promises.readdir(inDir);

    for (const fileName of listOfFiles) {
      const filePath = path.join(inDir, fileName);
      const file = await fs.promises.stat(filePath);
      const timeZoneOffsetDate = timeZoneOffset(new Date(file.mtime));

      if (file.isDirectory()) {
        zip.file(fileName, null, {
          dir: true,
          date: timeZoneOffsetDate
        });
        const dir = zip.folder(fileName);
        if(!dir) {
          throw new Error(`fileName '${fileName}' couldn't get included als directory in the zip`);
        }

        await addFilesToZipArchive(dir, filePath);
      } else {
        zip.file( 
          fileName, 
          await fs.promises.readFile(filePath), 
          { date: timeZoneOffsetDate }
        );
      }
    }
  }

  async function createZipArchive(zip: JSZip) {
    // @ts-ignore
    zip.root = '';

    const file = await zip
      .generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9,
        },
      })
      
    const fileName = path.join(outDir, outFileName);

    if (fs.existsSync(fileName)) {
      await fs.promises.unlink(fileName);
    }

    await fs.promises.writeFile(fileName, file)
    done(undefined)
  }

  return {
    name: "vite-plugin-zip-pack",
    apply: "build",
    enforce: "post",
    async closeBundle() {
      try {
        console.log("\x1b[36m%s\x1b[0m", `Zip packing - "${inDir}" folder :`);
        
        if (!fs.existsSync(inDir)) {
          return console.log(
            "\x1b[31m%s\x1b[0m",
            `  - "${inDir}" folder does not exist!`
          );
        }

        if (!fs.existsSync(outDir)) {
          await fs.promises.mkdir(outDir)
        }

        if (pathPrefix && path.isAbsolute(pathPrefix)) {
          throw new Error('"pathPrefix" must be a relative path');
        }

        const zip = new JSZip();
        let archive: JSZip;

        if (pathPrefix) {
          const timeZoneOffsetDate = timeZoneOffset(new Date());

          zip.file(pathPrefix, null, {
            dir: true,
            date: timeZoneOffsetDate
          });
          const zipFolder = zip.folder(pathPrefix);
          
          if(zipFolder) {
            archive = zipFolder;
          } else {
            throw new Error("Files could not be loaded from 'pathPrefix'")
          }
        } else {
          archive = zip;
        }

        console.log("\x1b[32m%s\x1b[0m", "  - Preparing files.");
        addFilesToZipArchive(archive, inDir);

        console.log("\x1b[32m%s\x1b[0m", "  - Creating zip archive.");
        await createZipArchive(archive)

        console.log("\x1b[32m%s\x1b[0m", "  - Done.");
      } catch (error: any) {
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
        done(error)
      }
    }
  };
}
