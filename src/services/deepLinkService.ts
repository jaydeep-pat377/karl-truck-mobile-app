import { Linking } from 'react-native';
import { shortUrlService } from '../api/services/shortUrlService';
import { orderService } from '../api/services/orderService';
import { chatService } from '../api/services/chatService';
import { navigate } from './navigationService';
import { alertService } from './alertService';
import { useWorkspaceStore, Workspace } from '../store/workspaceStore';
import { queryClient } from '../lib/queryClient';

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
 * Find a workspace matching the tenant identifier.
 * Tries matching by: slug → subdomain → id (in priority order).
 */
function findWorkspaceByTenant(
  workspaces: Workspace[],
  tenantSlug: string,
  tenantSubdomain?: string,
): Workspace | undefined {
  // 1. Match by slug (e.g. 'dl' → Dolese)
  let match = workspaces.find((w) => w.slug === tenantSlug);
  if (match) return match;

  // 2. Match by subdomain if resolve returned it (e.g. 'dolese')
  if (tenantSubdomain) {
    match = workspaces.find((w) => w.subdomain === tenantSubdomain);
    if (match) return match;
  }

  // 3. Fallback: match tenant_slug against subdomain or id
  //    (handles case where backend returns subdomain as tenant_slug)
  match = workspaces.find((w) => w.subdomain === tenantSlug || w.id === tenantSlug);
  return match;
}

/**
 * Ensure the app is on the correct tenant for the deep link.
 * Compares the link's tenant_slug (from DB `slug` column, e.g. 'dl', 'hc')
 * against the current workspace. If different, switches to the target tenant.
 *
 * Returns true if already on the correct tenant or switch succeeded.
 * Returns false if the user doesn't have access or switch failed.
 */
interface TenantMatchResult {
  matched: boolean;
  workspace?: Workspace;
  reason: string;
  debug: string;
}

async function ensureCorrectTenant(tenantSlug: string, tenantSubdomain?: string): Promise<TenantMatchResult> {
  const store = useWorkspaceStore.getState();

  // Load workspace list if not already loaded
  let { workspaces } = store;
  if (workspaces.length === 0) {
    console.log('[DeepLink] Workspace list empty, fetching tenants...');
    try {
      await store.fetchTenants();
    } catch (err) {
      console.error('[DeepLink] fetchTenants threw:', err);
    }
    workspaces = useWorkspaceStore.getState().workspaces;
  }

  // Build debug string for diagnostics
  const wsInfo = workspaces.map((w) => `${w.name}(slug=${w.slug}, sub=${w.subdomain}, id=${w.id})`);
  const debugInfo = `tenant_slug="${tenantSlug}", tenant_subdomain="${tenantSubdomain || 'n/a'}", workspaces=[${wsInfo.join(', ')}]`;

  console.log('[DeepLink] ensureCorrectTenant debug:', debugInfo);

  if (workspaces.length === 0) {
    return {
      matched: false,
      reason: 'Tenant list is empty. The /auth/mobile/tenants API returned no tenants.',
      debug: debugInfo,
    };
  }

  // Check if already on the correct tenant
  const currentTenantId = useWorkspaceStore.getState().currentWorkspaceId;
  const currentWorkspace = workspaces.find((w) => w.id === currentTenantId);

  if (currentWorkspace) {
    const isCurrentMatch =
      currentWorkspace.slug === tenantSlug ||
      currentWorkspace.subdomain === tenantSlug ||
      (tenantSubdomain && currentWorkspace.subdomain === tenantSubdomain);

    if (isCurrentMatch) {
      console.log('[DeepLink] Already on correct tenant:', currentWorkspace.name);
      return { matched: true, workspace: currentWorkspace, reason: 'already_on_tenant', debug: debugInfo };
    }
  }

  console.log('[DeepLink] Tenant mismatch — current:', currentWorkspace?.name, '→ target slug:', tenantSlug);

  // Find the target workspace
  const targetWorkspace = findWorkspaceByTenant(workspaces, tenantSlug, tenantSubdomain);
  if (!targetWorkspace) {
    return {
      matched: false,
      reason: `No workspace matches slug="${tenantSlug}". Available: ${wsInfo.join(', ')}`,
      debug: debugInfo,
    };
  }

  // Switch to the target tenant (updates base URL, tokens, and workspace state)
  console.log('[DeepLink] Switching to tenant:', targetWorkspace.name,
    '(slug:', targetWorkspace.slug, 'subdomain:', targetWorkspace.subdomain, ')');
  await store.switchTenant(targetWorkspace);

  // Clear stale query cache from the old tenant
  queryClient.removeQueries();

  console.log('[DeepLink] Tenant switch complete');
  return { matched: true, workspace: targetWorkspace, reason: 'switched', debug: debugInfo };
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
        navigate('OrderDetail', {
          orderId,
          orderCode,
          orderDate,
        });
        break;

      case 'performance':
        // Navigate to OrderDetail and instruct the screen to scroll to the
        // performance graph section on mount.
        navigate('OrderDetail', {
          orderId,
          orderCode,
          orderDate,
          initialSection: 'performance',
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

      case 'chat': {
        // Each order has a single chat room keyed by orderId. This mirrors
        // the existing handleChatPress logic in OrderDetailsScreen so the
        // deep link opens the same chat the user would get from tapping
        // the in-app chat button.
        const parsedChatId = parseInt(orderId, 10);
        if (!isNaN(parsedChatId)) {
          // Clear unread badge, same as the in-app handler does.
          chatService.markAsRead(parsedChatId).catch(() => {
            // non-fatal — best effort
          });
        }
        navigate('ChatRoom', {
          roomId: orderId,
          roomName: `Order #${orderCode}`,
          chatId: isNaN(parsedChatId) ? 0 : parsedChatId,
          orderId: isNaN(parsedChatId) ? 0 : parsedChatId,
          orderDate,
        });
        break;
      }

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
 * 2. Resolve short URL via federated server (cross-tenant capable)
 * 3. Switch tenant if the link belongs to a different workspace
 * 4. Parse original_url
 * 5. Navigate to the appropriate screen
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

  // Step 2: Resolve short URL
  // Try federated server first (works cross-tenant), fall back to current tenant backend
  try {
    let response = await shortUrlService.resolveShortUrlFederated(code);

    if (!response.success || !response.data) {
      // Fallback: try current tenant's backend
      console.log('[DeepLink] Federated resolve failed, trying tenant backend...');
      response = await shortUrlService.resolveShortUrl(code);
    }

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

    const { tenant_slug, tenant_subdomain, original_url } = response.data;
    console.log('[DeepLink] Resolved — tenant_slug:', tenant_slug, 'tenant_subdomain:', tenant_subdomain, 'url:', original_url);

    // Step 3: Switch to the correct tenant if needed
    if (tenant_slug) {
      try {
        const result = await ensureCorrectTenant(tenant_slug, tenant_subdomain);
        if (!result.matched) {
          console.warn('[DeepLink] Tenant match failed:', result.reason);
          console.warn('[DeepLink] Debug:', result.debug);
          alertService.showError(
            'Workspace Not Found',
            'You don\'t have access to the workspace associated with this link. Please contact your administrator to get access.',
          );
          return false;
        }
        console.log('[DeepLink] Tenant resolved:', result.reason, result.workspace?.name);
      } catch (error: any) {
        console.error('[DeepLink] Tenant switch failed:', error);
        alertService.showError(
          'Switch Failed',
          `Failed to switch workspace: ${error?.message || 'Unknown error'}`,
        );
        return false;
      }
    }

    // Step 4: Parse original_url
    const parsed = parseOriginalUrl(original_url);
    if (!parsed) {
      console.warn('[DeepLink] Failed to parse original_url');
      alertService.showError('Invalid Link', 'This link could not be processed.');
      return false;
    }

    console.log('[DeepLink] Navigating:', parsed.orderCode, parsed.orderDate, parsed.tab);

    // Step 5: Navigate (now on the correct tenant's backend)
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
