export const DIFFICULTIES = [
	{ id: "45", label: "Easy", desc: "A relaxed warm-up" },
	{ id: "40", label: "Normal", desc: "Just the right balance" },
	{ id: "35", label: "Medium", desc: "A steady challenge" },
	{ id: "30", label: "Hard", desc: "Focus and persistence" },
	{ id: "27", label: "Expert", desc: "For seasoned players" },
	{ id: "25", label: "Master", desc: "The ultimate test" },
] as const;

export type DifficultyId = (typeof DIFFICULTIES)[number]["id"];
