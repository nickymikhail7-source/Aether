'use client';

import type { StatsCardData } from '@/types/chat';

interface StatsCardProps {
    data: StatsCardData;
    onClickStat: (type: 'needs-reply' | 'action' | 'fyi') => void;
}

export function StatsCard({ data, onClickStat }: StatsCardProps) {
    return (
        <div className="grid grid-cols-3 gap-3 my-4">
            <div
                onClick={() => onClickStat('needs-reply')}
                className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center cursor-pointer hover:border-gray-300 hover:bg-gray-100 transition-colors"
            >
                <div className="text-[28px] font-bold text-red-400">{data.needsReply}</div>
                <div className="text-xs text-gray-500 mt-1">Needs Reply</div>
            </div>
            <div
                onClick={() => onClickStat('action')}
                className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center cursor-pointer hover:border-gray-300 hover:bg-gray-100 transition-colors"
            >
                <div className="text-[28px] font-bold text-amber-400">{data.actionItems}</div>
                <div className="text-xs text-gray-500 mt-1">Action Items</div>
            </div>
            <div
                onClick={() => onClickStat('fyi')}
                className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center cursor-pointer hover:border-gray-300 hover:bg-gray-100 transition-colors"
            >
                <div className="text-[28px] font-bold text-teal-600">{data.fyi}</div>
                <div className="text-xs text-gray-500 mt-1">FYI</div>
            </div>
        </div>
    );
}
