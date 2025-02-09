// https://github.com/jenseng/abuse-the-platform/blob/main/app/utils/singleton.ts

export function singleton<T>(name: string, valueFactory: () => T): T {
  const yolo = global as any;
  yolo.__singletons ??= {};
  yolo.__singletons[name] ??= valueFactory();
  return yolo.__singletons[name];
}
