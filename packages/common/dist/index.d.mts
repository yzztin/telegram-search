import * as _guiiai_logg from '@guiiai/logg';
import { useLogg } from '@guiiai/logg';

type Logger = ReturnType<typeof useLogg>;
declare function initLogger(): void;
/**
 * Get logger instance with directory name and filename
 * @returns logger instance configured with "directoryName/filename"
 */
declare function useLogger(): _guiiai_logg.Logg;

export { type Logger, initLogger, useLogger };
