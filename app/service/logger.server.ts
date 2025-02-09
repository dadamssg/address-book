import winston, { Logger } from "winston";
import { singleton } from "~/service/singleton.server";
import Transport from "winston-transport";
import { emitter } from "~/service/emitter.server";

class EmitterTransport extends Transport {
  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    emitter.emit("log", JSON.stringify(info));

    callback();
  }
}

export let logger: Logger = singleton("logger", () => {
  const instance = winston.createLogger({
    level: process.env.NODE_ENV !== "production" ? "debug" : "info",
    transports: [new winston.transports.Console()],
  });

  if (process.env.NODE_ENV !== "production") {
    instance.add(new EmitterTransport());
  }
  return instance;
});
