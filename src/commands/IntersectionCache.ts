import type { Arguments, CommandBuilder } from "yargs";
import * as fs from "fs";
import * as geom from "geometric";
import * as mc from "motorcycleGraph";
const { PerformanceObserver, performance } = require("perf_hooks");

type Options = {
  data: string;
  output: string;
};

function load(filename) {
  const rawdata = fs.readFileSync(filename, "utf-8");
  return JSON.parse(rawdata);
}

export const command: string = "intersection-cache";
export const description: string = "intersection-cache";

// according to the documentation there should following as the type:
// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) =>
  yargs.options({
    data: { type: "string" },
    output: { type: "string", demandOption: false },
  });

export const handler = (argv: Arguments<Options>): void => {
  if (!fs.existsSync(argv.data)) {
    console.log("file does not exist");
    return;
  }

  const obj = load(argv.data);

  const polygon = obj["polygon"].map((o) => [o.x, o.y]);
  const points = polygon.map((o) => geom.Point.fromArray(o));
  const width = 1599.0333251953125;
  const height = 580;

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

  let start = 0;

  const motorcycles_filename = argv.data.replace(".json", ".motorcycles.json");

  let motorcycles;

  if (fs.existsSync(motorcycles_filename)) {
    motorcycles = load(motorcycles_filename)["motorcycles"].map((o) =>
      mc.MotorcycleSegment.build(o)
    );
  } else {
    start = performance.now();
    motorcycles = mc.calculateMotorcycles(points, width, height);
    globalInformations["sizes"]["motorcycles"] = motorcycles.length;
    globalInformations["performance"]["motorcycles"] =
      performance.now() - start;
  }

  start = performance.now();
  const intersectionCache = mc.calculateIntersectionCache(motorcycles);
  globalInformations["performance"]["intersectionCache"] =
    performance.now() - start;

  globalInformations["sizes"]["intersections"] =
    Object.keys(intersectionCache).length;

  const output = { intersectionCache, globalInformations };
  let output_filename;

  if (argv.hasOwnProperty("output")) {
    output_filename = argv.output;
  } else {
    output_filename = argv.data.replace(".json", ".intersection-cache.json");
  }

  fs.writeFileSync(output_filename, JSON.stringify(output));
};
