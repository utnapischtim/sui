import type { Arguments, CommandBuilder } from "yargs";
import * as fs from "fs";
import * as geom from "geometric";
import * as mc from "motorcycleGraph";

type Options = {};

function load(filename) {
  const rawdata = fs.readFileSync(filename, "utf-8");
  return JSON.parse(rawdata);
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
  const nodeNames: any = order.length === 0 ? [] : order.split(" ");

  for (const nodeName of nodeNames) {
    customList.push(obj[nodeName]);
  }

  return customList;
}

function test(filename) {
  const obj = load(filename);

  const polygon = obj["polygon"].map((o) => [o.x, o.y]);
  const points = polygon.map((o) => geom.Point.fromArray(o));
  const width = 1599.0333251953125;
  const height = 580;

  const motorcycles = mc.calculateMotorcycles(points, width, height);
  const intersectionCache = mc.calculateIntersectionCache(motorcycles);

  const customList = orderBy(motorcycles, obj["order"]);
  const local = mc.calculateRandomList(customList, intersectionCache);

  const reductionCounterInformation = local.map((m) =>
    m.getReductionCounterInformation()
  );

  const actual = reductionCounterInformation.map((o) => o["reductionCounter"]);
  const expected = obj["expected"];

  const result = JSON.stringify(actual) == JSON.stringify(expected);
  console.log(`${filename} is ${result} ${obj["title"]}`);

  if (!result) {
    console.log(actual);
  }
}

export const command: string = "test";
export const description: string = "test";

// according to the documentation there should following as the type:
// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) => yargs.options({});

export const handler = (argv: Arguments<Options>): void => {
  const base = "data";
  const dir = fs.opendirSync(base);
  let testFile;

  while ((testFile = dir.readSync()) !== null) {
    test(`${base}/${testFile.name}`);
  }

  dir.closeSync();
};
