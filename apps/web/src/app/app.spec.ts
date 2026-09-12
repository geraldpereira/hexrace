import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from '@ui/app';

describe('App', () => {
  it('boots with a router outlet', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('router-outlet')).not.toBeNull();
  });
});
