import type { Arguments, CommandBuilder } from "yargs";
import * as fs from "fs";
import * as geom from "geometric";
import * as mc from "motorcycleGraph";
import * as cli from "./../utils";
const { PerformanceObserver, performance } = require("perf_hooks");

type Options = {
  data: string;
  output: string;
  overrideCache: boolean;
  simulateCache: boolean;
};

export const command: string = "intersection-cache";
export const description: string = "intersection-cache";

// according to the documentation there should following as the type:
// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) =>
  yargs.options({
    data: { type: "string" },
    output: { type: "string", demandOption: false },
    overrideCache: { type: "boolean", demandOption: false },
    simulateCache: { type: "boolean", demandOption: false },
  });

export const handler = (argv: Arguments<Options>): void => {
  if (!fs.existsSync(argv.data)) {
    console.log("file does not exist");
    return;
  }

  let output_filename = argv.hasOwnProperty("output")
    ? argv.output
    : argv.data.replace(".json", ".intersection-cache.json");

  if (fs.existsSync(output_filename) && !argv.overrideCache) {
    console.log(`file: ${output_filename} allready exists`);
    return;
  }

  const obj = cli.load(argv.data);
  const points = cli.convertAnyToGeom(obj);
  const [width, height] = cli.calculateDimensions(points);

  const globalInformations = {
    sizes: {
      motorcycles: 0,
      intersections: 0,
    },
    performance: {
      motorcycles: 0,
      intersectionCache: 0,
    },
  };

  const motorcycles_filename = argv.data.replace(".json", ".motorcycles.json");

  let motorcycles;

  if (fs.existsSync(motorcycles_filename)) {
    motorcycles = cli
      .load(motorcycles_filename)
      ["motorcycles"].map((o) => mc.MotorcycleSegment.build(o));
  } else {
    const start = performance.now();
    motorcycles = mc.calculateMotorcycles(points, width, height);
    globalInformations["sizes"]["motorcycles"] = motorcycles.length;

    const duration = performance.now() - start;
    globalInformations["performance"]["motorcycles"] = duration;
  }

  if (argv.hasOwnProperty("simulateCache") && argv.simulateCache) {
    const cache = {};
    const nodeNumbers: number[] = [];
    for (const motorcycle of motorcycles) {
      nodeNumbers.push(motorcycle.getNodeNumber());
    }

    for (const a in nodeNumbers) {
      for (const b in nodeNumbers) {
        const key = parseInt(a) < parseInt(b) ? `${a}-${b}` : `${b}-${a}`;
        if (!cache.hasOwnProperty(key)) {
          cache[key] = { i: 0, v: [] };
        }
        cache[key]["i"] += 1;
        cache[key]["v"].push([a, b, key]);
      }
    }
    output_filename = argv.data.replace(
      ".json",
      ".intersection-cache-simulated.json"
    );
    fs.writeFileSync(output_filename, JSON.stringify(cache));
  } else {
    const start = performance.now();
    const intersectionCache = mc.calculateIntersectionCache(motorcycles);
    const duration = performance.now() - start;
    globalInformations["performance"]["intersectionCache"] = duration;

    globalInformations["sizes"]["intersections"] =
      Object.keys(intersectionCache).length;

    const times: any = [];
    for (const key of Object.keys(intersectionCache)) {
      times.push(intersectionCache[key]["pointA"]["time"]);
      times.push(intersectionCache[key]["pointB"]["time"]);
    }

    for (let i = 0; i < times.length - 1; i += 2) {
      if (times[i].toFixed(10) == times[i + 1].toFixed(10)) {
        output_filename = argv.data.replace(
          ".json",
          ".intersection-cache-matched.json"
        );
        break;
      }
    }

    const output = {
      // intersectionCache,
      globalInformations,
    };
    fs.writeFileSync(output_filename, JSON.stringify(output));
  }
};
