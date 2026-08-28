import { useRouter } from '@/lib/router';
import { AuthProvider } from '@/lib/auth';
import { AdminAuthProvider } from '@/lib/adminAuth';
import { HomePage } from '@/pages/HomePage';
import { AuthPage } from '@/pages/AuthPage';
import { OrderPage } from '@/pages/OrderPage';
import { SuccessPage } from '@/pages/SuccessPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { CustomersPage } from './pages/CustomersPage';

function App() {
  const { route, navigate } = useRouter();

  let page;
  switch (route.name) {
    case 'home':
      page = <HomePage navigate={navigate} />;
      break;
    case 'auth':
      page = <AuthPage navigate={navigate} initialTab={route.tab} />;
      break;
    case 'order':
      page = <OrderPage navigate={navigate} />;
      break;
    case 'customers':
      page = <CustomersPage navigate={navigate} />;
      break;
    case 'success':
      page = <SuccessPage orderId={route.orderId} navigate={navigate} />;
      break;
    case 'dashboard':
      page = <DashboardPage navigate={navigate} />;
      break;
    case 'orders':
      page = <OrdersPage navigate={navigate} />;
      break;
    case 'settings':
      page = <SettingsPage navigate={navigate} />;
      break;
    default:
      page = <HomePage navigate={navigate} />;
  }

  return (
    <AuthProvider>
      <AdminAuthProvider>
        {page}
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;