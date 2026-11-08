import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppRoutes } from './App';

export function renderRouteHtml(url: string): string {
  return renderToString(
    <AppProvider>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AppProvider>
  );
}
