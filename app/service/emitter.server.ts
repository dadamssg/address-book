import { EventEmitter } from "node:events";
import { singleton } from "~/service/singleton.server";

export const emitter = singleton("emitter", () => new EventEmitter());
