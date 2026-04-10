import { Linking } from 'react-native';
import { shortUrlService } from '../api/services/shortUrlService';
import { orderService } from '../api/services/orderService';
import { navigate } from './navigationService';
import { alertService } from './alertService';

const SHORT_URL_HOST = 'tkai.tkurl.co';
const SHORT_URL_PATH_PREFIX = '/dl/';

export type DeepLinkTab = 'details' | 'tickets' | 'chat' | 'performance' | 'map';

export interface ParsedDeepLink {
  orderCode: string;
  orderDate: string;
  tab: DeepLinkTab;
}

/**
 * Parse a URL string into host, pathname, and query params.
 * Uses string manipulation instead of the URL API for React Native compatibility.
 */
function parseUrl(url: string): { host: string; pathname: string; params: Record<string, string> } | null {
  try {
    // Remove protocol
    const withoutProtocol = url.replace(/^https?:\/\//, '');
    const hostEnd = withoutProtocol.indexOf('/');
    const host = hostEnd === -1 ? withoutProtocol : withoutProtocol.substring(0, hostEnd);
    const rest = hostEnd === -1 ? '' : withoutProtocol.substring(hostEnd);

    // Split path and query
    const queryStart = rest.indexOf('?');
    const pathname = queryStart === -1 ? rest : rest.substring(0, queryStart);
    const queryString = queryStart === -1 ? '' : rest.substring(queryStart + 1);

    // Parse query params
    const params: Record<string, string> = {};
    if (queryString) {
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) {
          params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      });
    }

    return { host, pathname, params };
  } catch {
    return null;
  }
}

/**
 * Extract the short URL code from a universal link URL.
 * Expected format: https://tkai.tkurl.co/dl/{code}
 * Returns null if the URL is not a valid short URL.
 */
export function extractCodeFromUrl(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) {
    console.error('[DeepLink] Failed to parse URL:', url);
    return null;
  }

  if (parsed.host !== SHORT_URL_HOST) {
    console.warn('[DeepLink] Unknown host:', parsed.host);
    return null;
  }

  if (!parsed.pathname.startsWith(SHORT_URL_PATH_PREFIX)) {
    console.warn('[DeepLink] Unknown path:', parsed.pathname);
    return null;
  }

  const code = parsed.pathname.slice(SHORT_URL_PATH_PREFIX.length).replace(/\/+$/, '');
  if (!code) {
    console.warn('[DeepLink] Empty code in URL');
    return null;
  }

  return decodeURIComponent(code);
}

/**
 * Parse the original_url from the short URL record.
 * Expected format: /orders?date={orderDate}&order={orderCode}&tab={tab}
 */
export function parseOriginalUrl(originalUrl: string): ParsedDeepLink | null {
  try {
    // Handle relative URLs (e.g., /orders?date=...&order=...&tab=...)
    const queryStart = originalUrl.indexOf('?');
    const queryString = queryStart === -1 ? '' : originalUrl.substring(queryStart + 1);

    const params: Record<string, string> = {};
    if (queryString) {
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key) {
          params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      });
    }

    const orderCode = params.order;
    const orderDate = params.date;
    const tab = params.tab as DeepLinkTab;

    if (!orderCode) {
      console.warn('[DeepLink] Missing order in original_url');
      return null;
    }

    if (!orderDate) {
      console.warn('[DeepLink] Missing date in original_url');
      return null;
    }

    if (!tab) {
      console.warn('[DeepLink] Missing tab in original_url');
      return null;
    }

    const validTabs: DeepLinkTab[] = ['details', 'tickets', 'chat', 'performance', 'map'];
    if (!validTabs.includes(tab)) {
      console.warn('[DeepLink] Invalid tab value:', tab);
      return null;
    }

    return { orderCode, orderDate, tab };
  } catch {
    console.error('[DeepLink] Failed to parse original_url:', originalUrl);
    return null;
  }
}

/**
 * Navigate to the appropriate screen based on the parsed deep link data.
 * Fetches the order details to get orderId from orderCode + orderDate.
 */
async function navigateToScreen(data: ParsedDeepLink): Promise<void> {
  const { orderCode, orderDate, tab } = data;

  console.log('[DeepLink] Navigating to screen:', tab, 'order:', orderCode, 'date:', orderDate);

  try {
    // Fetch order details to get orderId
    const orderResponse = await orderService.getOrderDetails({
      order_code: orderCode,
      order_date: orderDate,
    });

    if (!orderResponse.success || !orderResponse.data?.order) {
      console.error('[DeepLink] Failed to fetch order details');
      alertService.showError('Order Not Found', 'The order in this link could not be found.');
      return;
    }

    const order = orderResponse.data.order;
    const orderId = order.order_id;

    switch (tab) {
      case 'details':
      case 'performance':
        navigate('OrderDetail', {
          orderId,
          orderCode,
          orderDate,
        });
        break;

      case 'tickets':
        navigate('Ticket', {
          orderId,
          orderCode,
          orderDate,
        });
        break;

      case 'map':
        navigate('Tracking', {
          orderId,
        });
        break;

      case 'chat':
        // Chat deep link: navigate to Order Details for now (chat tab TBD)
        navigate('OrderDetail', {
          orderId,
          orderCode,
          orderDate,
        });
        break;

      default:
        console.warn('[DeepLink] Unsupported tab:', tab);
        navigate('OrderDetail', {
          orderId,
          orderCode,
          orderDate,
        });
        break;
    }
  } catch (error) {
    console.error('[DeepLink] Navigation error:', error);
    alertService.showError('Error', 'Failed to load order details for this link.');
  }
}

/**
 * Handle an incoming deep link URL end-to-end.
 *
 * Flow:
 * 1. Extract code from URL
 * 2. Call backend to resolve the short URL
 * 3. Parse original_url
 * 4. Navigate to the appropriate screen
 *
 * Returns true if the URL was handled, false otherwise.
 */
export async function handleDeepLink(url: string): Promise<boolean> {
  console.log('[DeepLink] Handling URL:', url);

  // Step 1: Extract code
  const code = extractCodeFromUrl(url);
  if (!code) {
    console.warn('[DeepLink] Could not extract code from URL');
    return false;
  }

  console.log('[DeepLink] Code extracted:', code);

  // Step 2: Resolve short URL via backend
  try {
    const response = await shortUrlService.resolveShortUrl(code);

    if (!response.success || !response.data) {
      console.warn('[DeepLink] Short URL resolution failed:', response.message);
      const errorMessages: Record<string, string> = {
        NOT_FOUND: 'This link is no longer valid.',
        EXPIRED: 'This link has expired.',
      };
      alertService.showError(
        'Invalid Link',
        errorMessages[response.error_code || ''] || 'Unable to open this link.',
      );
      return false;
    }

    const { original_url } = response.data;
    console.log('[DeepLink] Resolved:', original_url);

    // Step 3: Parse original_url
    const parsed = parseOriginalUrl(original_url);
    if (!parsed) {
      console.warn('[DeepLink] Failed to parse original_url');
      alertService.showError('Invalid Link', 'This link could not be processed.');
      return false;
    }

    console.log('[DeepLink] Navigating:', parsed.orderCode, parsed.orderDate, parsed.tab);

    // Step 4: Navigate
    await navigateToScreen(parsed);
    return true;
  } catch (error) {
    console.error('[DeepLink] Error handling deep link:', error);
    alertService.showError('Error', 'Something went wrong while opening this link.');
    return false;
  }
}

export function isShortUrl(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) {
    return false;
  }
  return parsed.host === SHORT_URL_HOST && parsed.pathname.startsWith(SHORT_URL_PATH_PREFIX);
}

export async function getInitialDeepLink(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    if (url && isShortUrl(url)) {
      return url;
    }
    return null;
  } catch {
    console.error('[DeepLink] Error getting initial URL');
    return null;
  }
}
