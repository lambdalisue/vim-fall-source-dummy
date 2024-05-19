import type { GetSource } from "https://deno.land/x/fall_core@v0.11.0/mod.ts";
import { fromFileUrl } from "https://deno.land/std@0.217.0/path/from_file_url.ts";
import { TextLineStream } from "jsr:@std/streams@0.224.0/text-line-stream";
import { delay } from "jsr:@std/async/delay";
import { faker } from "npm:@faker-js/faker";
import { toJson } from "jsr:@std/streams@0.224.0/to-json";
import { assert, ensure, is } from "jsr:@core/unknownutil@3.18.0";

const isOptions = is.StrictOf(is.PartialOf(is.ObjectOf({
  count: is.Number,
  intervalCount: is.Number,
  intervalDelay: is.Number,
})));

export const getSource: GetSource = (_denops, options) => {
  assert(options, isOptions);
  const count = options.count ?? 1_000_000;
  const intervalCount = options.intervalCount ?? 1000;
  const intervalDelay = options.intervalDelay ?? 1;
  return {
    stream() {
      return new ReadableStream({
        async start(controller) {
          const command = new Deno.Command(Deno.execPath(), {
            args: ["run", "-A", fromFileUrl(import.meta.url)],
            stdin: "piped",
            stdout: "piped",
          });
          const proc = command.spawn();
          await Promise.all([
            proc.status,
            ReadableStream
              .from(JSON.stringify({ count, intervalCount, intervalDelay }))
              .pipeThrough(new TextEncoderStream())
              .pipeTo(proc.stdin),
            proc.stdout
              .pipeThrough(new TextDecoderStream())
              .pipeThrough(new TextLineStream())
              .pipeTo(
                new WritableStream({
                  write(json) {
                    controller.enqueue(JSON.parse(json));
                  },
                }),
              ),
          ]);
          controller.close();
        },
      });
    },
  };
};

if (import.meta.main) {
  const { count, intervalCount, intervalDelay } = ensure(
    await toJson(Deno.stdin.readable),
    is.ObjectOf({
      count: is.Number,
      intervalCount: is.Number,
      intervalDelay: is.Number,
    }),
  );
  try {
    for (let index = 0; index < count; index++) {
      const path = faker.system.filePath();
      console.log(JSON.stringify({
        value: path,
        detail: {
          path,
          index,
        },
      }));
      if (index % intervalCount === 0) {
        await delay(intervalDelay);
      }
    }
  } catch {
    // Fail silently
  }
}
