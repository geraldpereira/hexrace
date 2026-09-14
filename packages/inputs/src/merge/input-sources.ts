import { InjectionToken } from '@angular/core';

import { type InputSource } from '@inputs/entity/input-source';

/** The sources the merge reads, provided as a multi token by `provideInputSources` or a test. */
export const INPUT_SOURCES = new InjectionToken<readonly InputSource[]>('INPUT_SOURCES');
