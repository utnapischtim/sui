import * as fs from "fs";
import * as geom from "geometric";
import * as mc from "motorcycleGraph";

export function shuffle(
  motorcycles: mc.MotorcycleSegment[]
): mc.MotorcycleSegment[] {
  return motorcycles
    .map((v) => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

export function orderBy(
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

export function convertAnyToGeom(obj: any): geom.Point[] {
  const polygon = obj["polygon"].map((o) => [o.x, o.y]);
  return polygon.map((o) => geom.Point.fromArray(o));
}

export function load(filename) {
  const rawdata = fs.readFileSync(filename, "utf-8");
  return JSON.parse(rawdata);
}

export function calculateDimensions(points: geom.Point[]): [number, number] {
  const width_positive = points.reduceRight(
    (acc, cur) => (acc.x < cur.x ? cur : acc),
    { x: 0, y: 0 }
  )[0];
  const width_negative = points.reduceRight(
    (acc, cur) => (acc.x > cur.x ? cur : acc),
    { x: 0, y: 0 }
  )[0];

  const height_positive = points.reduceRight(
    (acc, cur) => (acc.y < cur.y ? cur : acc),
    { x: 0, y: 0 }
  )[1];

  const height_negative = points.reduceRight(
    (acc, cur) => (acc.y > cur.y ? cur : acc),
    { x: 0, y: 0 }
  )[1];

  return [
    width_positive + Math.abs(width_negative),
    height_positive + Math.abs(height_negative),
  ];
}
