import type { GetSource } from "https://deno.land/x/fall_core@v0.11.0/mod.ts";
import { delay } from "jsr:@std/async/delay";
import { faker } from "npm:@faker-js/faker";
import { assert, is } from "jsr:@core/unknownutil@3.18.0";

const isOptions = is.StrictOf(is.PartialOf(is.ObjectOf({
  count: is.Number,
  intervalCount: is.Number,
  intervalDelay: is.Number,
})));

export const getSource: GetSource = (_denops, options) => {
  assert(options, isOptions);
  const count = options.count ?? 1_000_000;
  const intervalCount = options.intervalCount ?? 100;
  const intervalDelay = options.intervalDelay ?? 10;
  return {
    stream() {
      return new ReadableStream({
        async start(controller) {
          for (let index = 0; index < count; index++) {
            const path = faker.system.filePath();
            controller.enqueue({
              value: path,
              detail: {
                path,
                index,
              },
            });
            if (index % intervalCount === 0) {
              await delay(intervalDelay);
            }
          }
        },
      });
    },
  };
};
