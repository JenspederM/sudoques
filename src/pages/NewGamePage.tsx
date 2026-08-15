import type React from "react";
import { DifficultyList } from "@/components/DifficultyList";
import { Layout } from "@/components/Layout";
import { PageTitle } from "@/components/PageTitle";
import { useScores } from "@/contexts/ScoresContext";
import type { Difficulty } from "@/types";

interface NewGamePageProps {
	onSelectDifficulty: (difficulty: Difficulty) => void;
}

export const NewGamePage: React.FC<NewGamePageProps> = ({
	onSelectDifficulty,
}) => {
	const { scores, isLoading, isUnavailable } = useScores();

	return (
		<Layout backRedirect="/" headerCenter={<PageTitle title="New Game" />}>
			<DifficultyList
				scores={scores}
				isLoading={isLoading}
				isUnavailable={isUnavailable}
				onSelectDifficulty={onSelectDifficulty}
			/>
		</Layout>
	);
};
