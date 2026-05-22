export interface UserPermissions {
  email: string;
  canSeeFinishSection: boolean;
  canManageFinishProducts: boolean; // Add, Edit, Delete
  canChangeFinishStock: boolean;
  canManageMaterialsProducts: boolean; // Add, Edit, Delete
  canChangeMaterialsStock: boolean;
  canSeeAdminMenu: boolean;
  canSeeRegistryMenu: boolean;
  canSeeBurstMode: boolean; // Burst Mode
  canSeeLogs: boolean; // Logs
  canManageAccounts?: boolean;
  roleLabel: string;
}

export const PREDEFINED_ACCOUNTS = [
  { email: 'chhayheng@luxury-paint.com', password: 'Heng@1188' },
  { email: 'thai@luxury-paint.com', password: 'Thai#luxury.123' },
  { email: 'mern@luxury-paint.com', password: 'Mern#luxury.452' },
  { email: 'sokny@luxury-paint.com', password: 'Sokny#luxury.917' }
];

export function getUserPermissions(email: string | null | undefined): UserPermissions {
  const normalizedEmail = email?.toLowerCase() || '';

  if (normalizedEmail === 'chhayheng@luxury-paint.com') {
    return {
      email: normalizedEmail,
      canSeeFinishSection: true,
      canManageFinishProducts: true,
      canChangeFinishStock: true,
      canManageMaterialsProducts: true,
      canChangeMaterialsStock: true,
      canSeeAdminMenu: true,
      canSeeRegistryMenu: true,
      canSeeBurstMode: true,
      canSeeLogs: true,
      canManageAccounts: true, // Only chhayheng has this
      roleLabel: 'Chhayheng (Super Admin)'
    };
  }

  if (normalizedEmail === 'thai@luxury-paint.com') {
    return {
      email: normalizedEmail,
      canSeeFinishSection: true,
      canManageFinishProducts: false,
      canChangeFinishStock: false, // "Cannot change Finish Product. View only permission for Finish Product."
      canManageMaterialsProducts: false,
      canChangeMaterialsStock: true, // "Can access Stock, Burst Mode, and Logs."
      canSeeAdminMenu: false,
      canSeeRegistryMenu: false,
      canSeeBurstMode: true,
      canSeeLogs: true,
      canManageAccounts: false,
      roleLabel: 'Thai (View Finish, Stock & Logs)'
    };
  }

  if (normalizedEmail === 'mern@luxury-paint.com') {
    return {
      email: normalizedEmail,
      canSeeFinishSection: true,
      canManageFinishProducts: true, // "Can Add, Edit, and Delete Finish Product. Full Finish Product management access."
      canChangeFinishStock: true,
      canManageMaterialsProducts: false,
      canChangeMaterialsStock: true,
      canSeeAdminMenu: false,
      canSeeRegistryMenu: false,
      canSeeBurstMode: true,
      canSeeLogs: true,
      canManageAccounts: false,
      roleLabel: 'Mern (Finish Product Manager)'
    };
  }

  if (normalizedEmail === 'sokny@luxury-paint.com') {
    return {
      email: normalizedEmail,
      canSeeFinishSection: false, // "Can manage Product only" - Restricted from other management functions (like Finishes)
      canManageFinishProducts: false,
      canChangeFinishStock: false,
      canManageMaterialsProducts: true, // "Can manage Product only" - meaning materials / non-finish products
      canChangeMaterialsStock: true,
      canSeeAdminMenu: false,
      canSeeRegistryMenu: false,
      canSeeBurstMode: true,
      canSeeLogs: true,
      canManageAccounts: false,
      roleLabel: 'Sokny (Product Manager)'
    };
  }

  // Admin or other accounts
  return {
    email: normalizedEmail,
    canSeeFinishSection: true,
    canManageFinishProducts: true,
    canChangeFinishStock: true,
    canManageMaterialsProducts: true,
    canChangeMaterialsStock: true,
    canSeeAdminMenu: true,
    canSeeRegistryMenu: true,
    canSeeBurstMode: true,
    canSeeLogs: true,
    canManageAccounts: false,
    roleLabel: 'Administrator'
  };
}
