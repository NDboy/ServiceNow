import '@servicenow/sdk/global';
import { UiPage } from '@servicenow/sdk/core';
import portalPage from '../../client/index.html';

export const game_portal_page = UiPage({
  $id: Now.ID['game-portal-page'], 
  endpoint: 'x_1567198_enhanced_portal.do',
  description: 'Enhanced Game Portal with Marko Adventure and retro 80s styling',
  category: 'general',
  html: portalPage,
  direct: true
});