// Les services sont des @Injectable : le compilateur JIT d'Angular doit être chargé pour que les
// décorateurs s'exécutent sous Vitest, et TestBed veut une plateforme.
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
