export const intentConfig = {
    meeting_request: {
        icon: '📅',
        label: 'Meeting Request',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        badgeColor: 'bg-blue-500',
    },
    payment_required: {
        icon: '💰',
        label: 'Payment Due',
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        badgeColor: 'bg-amber-500',
    },
    action_required: {
        icon: '⚡',
        label: 'Action Required',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        badgeColor: 'bg-orange-500',
    },
    reply_needed: {
        icon: '💬',
        label: 'Reply Needed',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        badgeColor: 'bg-yellow-500',
    },
    fyi_informational: {
        icon: '📄',
        label: 'FYI',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        badgeColor: 'bg-gray-500',
    },
    promotional: {
        icon: '🛒',
        label: 'Promotional',
        color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        badgeColor: 'bg-pink-500',
    },
    transactional: {
        icon: '🧾',
        label: 'Receipt',
        color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        badgeColor: 'bg-slate-500',
    },
    personal: {
        icon: '👤',
        label: 'Personal',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        badgeColor: 'bg-green-500',
    },
};

export const actionConfig = {
    respond: { icon: '↩️', label: 'Reply', buttonStyle: 'bg-blue-600 hover:bg-blue-500' },
    schedule: { icon: '📅', label: 'Schedule', buttonStyle: 'bg-indigo-600 hover:bg-indigo-500' },
    pay: { icon: '💳', label: 'Pay', buttonStyle: 'bg-green-600 hover:bg-green-500' },
    review: { icon: '👁️', label: 'Review', buttonStyle: 'bg-purple-600 hover:bg-purple-500' },
    sign: { icon: '✍️', label: 'Sign', buttonStyle: 'bg-amber-600 hover:bg-amber-500' },
    decide: { icon: '🤔', label: 'Decide', buttonStyle: 'bg-orange-600 hover:bg-orange-500' },
    none: { icon: '✓', label: 'No Action', buttonStyle: 'bg-gray-600 hover:bg-gray-500' },
};
