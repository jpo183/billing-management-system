// roleConfig.js
export const ROLE_PERMISSIONS = {
    admin: [
        'partner-setup',
        'one-time-billing',
        'monthly-billing-import',
        'bulk-one-time-billing',
        'reporting',
        'billing-items',
        'generate-invoice',
        'unfinalized-invoices',
        'finalized-invoices',
        'user-management'
    ],
    billing_manager: [
        'partner-setup',
        'one-time-billing',
        'monthly-billing-import',
        'bulk-one-time-billing',
        'reporting',
        'billing-items',
        'generate-invoice',
        'unfinalized-invoices',
        'finalized-invoices'
    ],
    user: [
        'one-time-billing'
    ]
};

// Helper function to check if a user has permission
export const hasPermission = (userRole, route) => {
    return ROLE_PERMISSIONS[userRole]?.includes(route) || false;
};