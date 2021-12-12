import type { Arguments, CommandBuilder } from "yargs";
import * as fs from "fs";
import * as geom from "geometric";
import * as mc from "motorcycleGraph";
const { PerformanceObserver, performance } = require("perf_hooks");

type Options = {
  data: string;
  output: string;
  greedylevel: number;
  order: string;
  count: number;
};

function load(filename) {
  const rawdata = fs.readFileSync(filename, "utf-8");
  return JSON.parse(rawdata);
}

function shuffle(motorcycles: mc.MotorcycleSegment[]): mc.MotorcycleSegment[] {
  return motorcycles
    .map((v) => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

function orderBy(
  motorcycles: mc.MotorcycleSegment[],
  order: string
): mc.MotorcycleSegment[] {
  const obj = {};
  for (const motorcycle of motorcycles) {
    obj[motorcycle.getNodeName()] = motorcycle;
  }

  const customList: any = [];
  for (const nodeName of order.split(" ")) {
    customList.push(obj[nodeName]);
  }

  return customList;
}

export const command: string = "motorcycle-graph";
export const description: string = "motorcycle-graph";

// according to the documentation there should following as the type:
// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) =>
  yargs.options({
    data: { type: "string" },
    output: { type: "string", demandOption: false },
    greedylevel: { type: "number", default: 1, demandOption: false },
    order: { type: "string", demandOption: false },
    count: { type: "number", demandOption: false },
  });

export const handler = (argv: Arguments<Options>): void => {
  if (!fs.existsSync(argv.data)) {
    console.log("file does not exist");
    return;
  }

  const output_filename = argv.hasOwnProperty("output")
    ? argv.output
    : argv.data.replace(".json", ".motorcycle-graph.json");

  if (fs.existsSync(output_filename)) {
    console.log(`file: ${output_filename} allready exists`);
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
      calculateRandomLists: 0,
    },
  };

  let start = 0;

  const motorcycles_filename = argv.data.replace(".json", ".motorcycles.json");
  const intersection_cache_filename = argv.data.replace(
    ".json",
    ".intersection-cache.json"
  );

  let motorcycles;

  if (fs.existsSync(motorcycles_filename)) {
    motorcycles = load(motorcycles_filename)["motorcycles"].map((o) =>
      mc.MotorcycleSegment.build(o)
    );
  } else {
    start = performance.now();
    motorcycles = mc.calculateMotorcycles(points, width, height);
    globalInformations["performance"]["motorcycles"] =
      performance.now() - start;
  }

  let intersectionCache;

  if (fs.existsSync(intersection_cache_filename)) {
    intersectionCache = load(intersection_cache_filename)["intersectionCache"];
  } else {
    start = performance.now();
    intersectionCache = mc.calculateIntersectionCache(motorcycles);
    globalInformations["performance"]["intersectionCache"] =
      performance.now() - start;
  }

  let size = motorcycles.length * argv.greedylevel;
  globalInformations["sizes"]["motorcycles"] = size;
  globalInformations["sizes"]["intersections"] =
    Object.keys(intersectionCache).length;

  const list: any[] = [];

  if (argv.hasOwnProperty("count")) {
    size = argv.count;
  }

  start = performance.now();

  if (argv.hasOwnProperty("order")) {
    const customList = orderBy(motorcycles, argv.order);
    const local = mc.calculateRandomList(customList, intersectionCache);
    const reductionCounterInformation = local.map((m) =>
      m.getReductionCounterInformation()
    );
    list.push(reductionCounterInformation);
  } else {
    for (let i = 0; i < size; i += 1) {
      const localStart = performance.now();
      const customList = shuffle(motorcycles);
      const local = mc.calculateRandomList(customList, intersectionCache);

      const reductionCounterInformation = local.map((m) =>
        m.getReductionCounterInformation()
      );
      const duration = performance.now() - localStart;
      list.push({ reductionCounterInformation, duration });
    }
  }

  globalInformations["performance"]["calculateRandomLists"] =
    performance.now() - start;

  const output = { list, globalInformations };

  fs.writeFileSync(output_filename, JSON.stringify(output));
};
