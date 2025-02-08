import { setGlobalLogLevel, LogLevel, setGlobalFormat, Format, useLogg } from '@guiiai/logg';

function initLogger() {
  setGlobalLogLevel(LogLevel.Debug);
  setGlobalFormat(Format.Pretty);
  const logger = useLogg("logger").useGlobalConfig();
  logger.log("Logger initialized");
}
function useLogger() {
  const stack = new Error("logger").stack;
  const caller = stack?.split("\n")[2];
  const match = caller?.match(/\/([^/]+)\/([^/]+?)\.[jt]s/);
  const dirName = match?.[1] || "unknown";
  const fileName = match?.[2] || "unknown";
  return useLogg(`${dirName}/${fileName}`).useGlobalConfig();
}

export { initLogger, useLogger };
