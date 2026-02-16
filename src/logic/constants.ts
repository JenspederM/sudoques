import type { LabelledDifficulty } from "@/types";

export const DIFFICULTIES: LabelledDifficulty[] = [
	{ id: "easy", label: "Easy", desc: "A relaxed warm-up" },
	{ id: "normal", label: "Normal", desc: "Just the right balance" },
	{ id: "medium", label: "Medium", desc: "A steady challenge" },
	{ id: "hard", label: "Hard", desc: "Focus and persistence" },
	{ id: "expert", label: "Expert", desc: "For seasoned players" },
	{ id: "master", label: "Master", desc: "The ultimate test" },
] as const;
