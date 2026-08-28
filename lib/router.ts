import { useState, useEffect } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'auth'; tab?: 'customer' | 'admin' }
  | { name: 'order' }
  | { name: 'success'; orderId: string }
  | { name: 'dashboard' }
  | { name: 'orders' }
  | { name: 'customers' }
  | { name: 'settings' };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  switch (parts[0]) {
    case 'auth':
      return { name: 'auth', tab: parts[1] === 'admin' ? 'admin' : 'customer' };
    case 'order':
      return { name: 'order' };
    case 'success':
      return { name: 'success', orderId: parts[1] || '' };
    case 'dashboard':
      return { name: 'dashboard' };
    case 'orders':
      return { name: 'orders' };
    case 'customers':
      return { name: 'customers' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'home' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'auth':
      return route.tab === 'admin' ? '#/auth/admin' : '#/auth';
    case 'order':
      return '#/order';
    case 'success':
      return `#/success/${route.orderId}`;
    case 'dashboard':
      return '#/dashboard';
    case 'orders':
      return '#/orders';
    case 'customers':
      return '#/customers';
    case 'settings':
      return '#/settings';
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = (r: Route) => {
    window.location.hash = routeToHash(r);
  };

  return { route, navigate };
}