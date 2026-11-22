import { Layout } from './components/Layout';
import { useHashRoute } from './hooks';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Notifications from './pages/Notifications';
import Notes from './pages/Notes';
import RedisTools from './pages/RedisTools';

export default function App() {
  const route = useHashRoute();

  let page;
  switch (route) {
    case '':
      page = <Dashboard />;
      break;
    case 'products':
      page = <Products />;
      break;
    case 'customers':
      page = <Customers />;
      break;
    case 'orders':
      page = <Orders />;
      break;
    case 'notifications':
      page = <Notifications />;
      break;
    case 'notes':
      page = <Notes />;
      break;
    case 'redis':
      page = <RedisTools />;
      break;
    default:
      page = (
        <div className="not-found">
          <h1>Page not found</h1>
          <p>The page “{route}” does not exist.</p>
          <a href="#/">Back to dashboard</a>
        </div>
      );
  }

  return <Layout route={route}>{page}</Layout>;
}
