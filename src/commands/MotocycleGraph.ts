import type { Arguments, CommandBuilder } from 'yargs';
import * as fs from 'fs';
import * as geom from "geometric";
import * as mc from "motorcycleGraph";

type Options = {
  data: string;
  output: string;
  greedyLevel: number;
};

function shuffle(motorcycles: mc.MotorcycleSegment[]): mc.MotorcycleSegment[] {
  return motorcycles
    .map((v) => ({v, sort: Math.random()}))
    .sort((a, b) => a.sort - b.sort)
    .map(({v}) => v);
}

function calculateRandomList(
  motorcyclesCustomList: mc.MotorcycleSegment[],
  motorcycles: mc.MotorcycleSegment[]
): mc.MotorcycleSegment[] {
  let localCustomList: mc.MotorcycleSegment[] = [];

  for (const motorcycle of motorcycles) {
    motorcycle.reset();
    motorcycle.resetReductionCounter();
  }

  const motorcycleGraph = new mc.MotorcycleGraph({isShortcut: true});

  for (const customEntry of motorcyclesCustomList) {
    for (const motorcycle of motorcycles) {
      motorcycle.reset();
    }

    customEntry.isUsed = true;
    localCustomList.push(customEntry);
    motorcycleGraph.calculateMotorcycleGraph(localCustomList);
  }

  return localCustomList;
}

export const command: string = 'motorcycle <data> <output> <greedyLevel>';
export const description: string = 'motorcycle <data> <output> <greedyLevel>';

// according to the documentation there should following as the type:
// CommandBuilder<Options, Options> but the compiler could not handle it.
export const builder: any = (yargs) =>
  yargs
    .options({
      data: { type: 'string' },
      output: { type: "string" },
      greedyLevel: { type: "number", default: 1}
    });


export const handler = (argv: Arguments<Options>): void => {

  const rawdata = fs.readFileSync(argv.data, 'utf-8');
  const obj = JSON.parse(rawdata);

  const polygon = obj["polygon"].map(o => [o.x, o.y]);
  const points = polygon.map(o => geom.Point.fromArray(o));
  const width = 1599.0333251953125;
  const height = 580;
  const motorcycles = mc.calculateMotorcycles(points, width, height);
  const size = motorcycles.length * argv.greedyLevel;

  const list: any[] = [];

  for (let i = 0; i < size; i += 1) {
    const customList = shuffle(motorcycles);
    const local = calculateRandomList(customList, motorcycles);
    const reductionCounterInformation = local.map(m => m.getReductionCounterInformation());
    list.push(reductionCounterInformation);
  }

  fs.writeFileSync(argv.output, JSON.stringify(list));
};
