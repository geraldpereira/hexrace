import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
}));
