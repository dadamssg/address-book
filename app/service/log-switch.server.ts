import { singleton } from "~/service/singleton.server";

export let logSwitch = singleton("logSwitch", () => {
  return {
    source: "api" as "api" | "db",
  };
});
