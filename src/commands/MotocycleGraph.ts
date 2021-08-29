import type { Arguments, CommandBuilder } from 'yargs';
import * as fs from 'fs';
import * as geom from "geometric";
import * as mc from "motorcycleGraph";

type Options = {
  data: string;
};

function shuffle(motorcycles) {
  return motorcycles
    .map((v) => ({v, sort: Math.random()}))
    .sort((a, b) => a.sort - b.sort)
    .map(({v}) => v);
}

function calculateRandomList(motorcyclesCustomList, motorcycles) {
  let localCustomList = [];

  for (const motorcycle of motorcycles) {
    motorcycle.reset();
    motorcycle.resetReductionCounter();
  }

  for (const customEntry of motorcyclesCustomList) {
    for (const motorcycle of motorcycles) {
      motorcycle.reset();
    }

    customEntry.isUsed = true;
    localCustomList.push(customEntry);
    mc.calculateMotorcycleGraph(localCustomList);
  }

  return localCustomList;
}

export const command: string = 'motorcycle <data>';
export const description: string = 'motorcycle <data>';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
  yargs
    .options({
      data: { type: 'string' },
    });


export const handler = (argv: Arguments<Options>): void => {
  const rawdata = fs.readFileSync(argv.data, 'utf-8');
  const obj = JSON.parse(rawdata);

  const polygon = obj["polygon"].map(o => [o.x, o.y]);
  const points = polygon.map(o => geom.Point.fromArray(o));
  const width = 1599.0333251953125;
  const height = 580;
  const motorcycles = mc.calculateMotorcycles(points, width, height);

  for (let i = 0; i < motorcycles.length; i += 1) {
    const customList = shuffle(motorcycles);
    const local = calculateRandomList(customList, motorcycles);
    const reductionCounter = local.map(m => m.reductionCounter);
    console.log(reductionCounter);
  }
};
