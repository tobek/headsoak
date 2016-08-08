// @TODO/rewrite literally this entire file might not be necessary depending on how/if we use routes

import { RouterConfig } from '@angular/router';
import { Home } from './home';
import { About } from './about';
import { NoContent } from './no-content';

export const routes: RouterConfig = [
  { path: '',      component: Home },
  { path: 'home',  component: Home },
  { path: 'about', component: About },
  { path: '**',    component: NoContent },
];
