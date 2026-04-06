import { User } from '../types/user';

// ---------------------------------------------------------------------------
// Order Request Permissions — matches web exactly
//
// Web source:
//   order-request/page.tsx      → canSeeAllOrders (line 234)
//   order-request/[id]/page.tsx → canManageOrders (line 134)
//
// Web logic (same for both):
//   isAdmin
//   || role.name.includes("concrete producer") || role.name.includes("producer")
//   || role.role_type === "region_role" || role.role_type === "plant_role" || role.role_type === "mixed_role"
//
// Web list page:
//   - Create button: ALWAYS visible (no role check)
//   - List: ALWAYS visible (backend filters data)
//
// Web detail page:
//   - Accept/Reject/Update + Verification: canManageOrders && isPendingOrSubmitted
// ---------------------------------------------------------------------------

export interface OrderRequestPermissions {
  /** Same as web's canManageOrders — controls Accept/Reject/Update + Verification */
  canManageOrders: boolean;
}

/**
 * Determine canManageOrders — exact same logic as web.
 *
 * Uses userType from backend (primary) + userRole name matching (fallback).
 */
export const getUserPermissions = (user: User | null | undefined): OrderRequestPermissions => {
  if (!user) {
    return { canManageOrders: false };
  }

  const raw = user as any;
  const userType: string = (raw.userType ?? raw.user_type ?? '').toString();
  const userRole: string = (raw.userRole ?? raw.user_role ?? '').toString();
  const roleLower = userRole.toLowerCase().trim();

  // All users can manage orders except contractors
  const canManageOrders = userType !== 'contractor';
  return { canManageOrders };
};

/**
 * Normalise raw API user object — copies snake_case to camelCase.
 */
export const normaliseUserRole = (rawUser: Record<string, any>): Record<string, any> => {
  const result = { ...rawUser };
  if (result.userType === undefined && result.user_type !== undefined) {
    result.userType = result.user_type;
  }
  if (result.userRole === undefined && result.user_role !== undefined) {
    result.userRole = result.user_role;
  }
  return result;
};

/**
 * Chat sender role — matches web (order-request/[id]/page.tsx line 145-151).
 */
export const getSenderRole = (user: User | null | undefined): string => {
  if (!user) return 'contractor';
  const raw = user as any;
  const userType: string = (raw.userType ?? raw.user_type ?? '').toString();
  const roleLower: string = (raw.userRole ?? raw.user_role ?? '').toString().toLowerCase();

  if (userType === 'admin' || roleLower.includes('tk admin') || roleLower.includes('tk-admin')) return 'admin';
  if (userType === 'contractor' || roleLower.includes('contractor')) return 'contractor';
  return 'concrete_producer';
};
