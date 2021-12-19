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
};

export const command: string = "motorcycles";
export const description: string = "motorcycles";

// according to the documentation there should following as the type:
/// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) =>
  yargs.options({
    data: { type: "string" },
    output: { type: "string", demandOption: false },
    overrideCache: { type: "boolean", demandOption: false, default: false },
  });

export const handler = (argv: Arguments<Options>): void => {
  if (!fs.existsSync(argv.data)) {
    console.log(`file ${argv.data} does not exist`);
    return;
  }

  const output_filename = argv.hasOwnProperty("output")
    ? argv.output
    : argv.data.replace(".json", ".motorcycles.json");

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
    },
    performance: {
      motorcycles: 0,
    },
  };

  const start = performance.now();
  const motorcycles = mc.calculateMotorcycles(points, width, height);
  const duration = performance.now() - start;
  globalInformations["performance"]["motorcycles"] = duration;
  globalInformations["sizes"]["motorcycles"] = motorcycles.length;

  const output = { motorcycles, globalInformations };

  fs.writeFileSync(output_filename, JSON.stringify(output));
};
