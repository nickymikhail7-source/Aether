'use client';

interface QuickChipsProps {
    chips: string[];
    onSelect: (chip: string) => void;
}

export function QuickChips({ chips, onSelect }: QuickChipsProps) {
    return (
        <div className="flex gap-2 flex-wrap mt-4">
            {chips.map((chip, index) => (
                <button
                    key={index}
                    onClick={() => onSelect(chip)}
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-2xl text-[13px] text-gray-700 hover:bg-gray-200 transition-colors"
                >
                    {chip}
                </button>
            ))}
        </div>
    );
}
