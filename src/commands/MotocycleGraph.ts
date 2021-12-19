import type { Arguments, CommandBuilder } from "yargs";
import * as fs from "fs";
import * as mc from "motorcycleGraph";
import * as cli from "./../utils";
const { PerformanceObserver, performance } = require("perf_hooks");

type Options = {
  data: string;
  output: string;
  greedyLevel: number;
  order: string;
  count: number;
  override: boolean;
  saveMotorcycleCache: boolean;
  saveIntersectionCache: boolean;
  useMotorcycleCache: boolean;
  useIntersectionCache: boolean;
  postfix: string;
};

export const command: string = "motorcycle-graph";
export const description: string = "motorcycle-graph";

// according to the documentation there should following as the type:
// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) =>
  yargs.options({
    data: { type: "string" },
    output: { type: "string", demandOption: false },
    greedyLevel: { type: "number", demandOption: false, default: 1 },
    order: { type: "string", demandOption: false },
    count: { type: "number", demandOption: false },
    override: { type: "boolean", demandOption: false },
    saveMotorcycleCache: {
      type: "boolean",
      demandOption: false,
      default: true,
    },
    saveIntersectionCache: {
      type: "boolean",
      demandOption: false,
      default: true,
    },
    useMotorcycleCache: { type: "boolean", demandOption: false, default: true },
    useIntersectionCache: {
      type: "boolean",
      demandOption: false,
      default: true,
    },
    postfix: { type: "string", demandOption: false, default: "" },
  });

export const handler = (argv: Arguments<Options>): void => {
  console.log(argv);
  return;

  if (!fs.existsSync(argv.data)) {
    console.log(`file ${argv.data} does not exist`);
    return;
  }

  const output_filename = argv.hasOwnProperty("output")
    ? argv.output
    : argv.data.replace(".json", `.motorcycle-graph${argv.postfix}.json`);

  if (fs.existsSync(output_filename) && !argv.override) {
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
      calculateRandomLists: 0,
    },
  };

  const motorcycles_filename = argv.data.replace(".json", ".motorcycles.json");
  const intersection_cache_filename = argv.data.replace(
    ".json",
    ".intersection-cache.json"
  );

  let motorcycles;

  if (fs.existsSync(motorcycles_filename) && argv.useMotorcycleCache) {
    motorcycles = cli
      .load(motorcycles_filename)
      ["motorcycles"].map((o) => mc.MotorcycleSegment.build(o));
  } else {
    const start = performance.now();
    motorcycles = mc.calculateMotorcycles(points, width * 2, height * 2);
    const duration = performance.now() - start;
    globalInformations["performance"]["motorcycles"] = duration;
  }

  let intersectionCache;

  if (fs.existsSync(intersection_cache_filename) && argv.useIntersectionCache) {
    intersectionCache = mc.buildIntersectionCache(
      cli.load(intersection_cache_filename)["intersectionCache"]
    );
  } else {
    const start = performance.now();
    intersectionCache = mc.calculateIntersectionCache(motorcycles);
    const duration = performance.now() - start;
    globalInformations["performance"]["intersectionCache"] = duration;
  }

  globalInformations["sizes"]["motorcycles"] = motorcycles.length;
  globalInformations["sizes"]["intersections"] =
    Object.keys(intersectionCache).length;

  const list: any[] = [];
  const size = argv.hasOwnProperty("count")
    ? argv.count
    : motorcycles.length * argv.greedyLevel;

  if (argv.hasOwnProperty("order")) {
    const start = performance.now();
    const customList = cli.orderBy(motorcycles, argv.order);
    const local = mc.calculateRandomList(customList, intersectionCache);
    const reductionCounterInformation = local.map((m) =>
      m.getReductionCounterInformation()
    );
    const duration = performance.now() - start;
    list.push({ reductionCounterInformation, duration });
  } else {
    const start = performance.now();
    for (let i = 0; i < size; i += 1) {
      const localStart = performance.now();
      const customList = cli.shuffle(motorcycles);
      const local = mc.calculateRandomList(customList, intersectionCache);

      const reductionCounterInformation = local.map((m) =>
        m.getReductionCounterInformation()
      );
      const duration = performance.now() - localStart;
      list.push({ reductionCounterInformation, duration });
    }
    const duration = performance.now() - start;
    globalInformations["performance"]["calculateRandomLists"] = duration;
  }

  if (argv.saveMotorcycleCache) {
    const motorcycleCacheOutput = { motorcycles, globalInformations };
    const motorcycleCacheOutputFilename = argv.data.replace(
      ".json",
      ".motorcyles.json"
    );
    fs.writeFileSync(
      motorcycleCacheOutputFilename,
      JSON.stringify(motorcycleCacheOutput)
    );
  }

  if (argv.saveIntersectionCache) {
    const intersectionCacheOutput = { intersectionCache, globalInformations };
    const intersectionCacheOutputFilename = argv.data.replace(
      ".json",
      ".intersection-cache.json"
    );
    fs.writeFileSync(
      intersectionCacheOutputFilename,
      JSON.stringify(intersectionCacheOutput)
    );
  }

  const output = { list, globalInformations };

  fs.writeFileSync(output_filename, JSON.stringify(output));
};
