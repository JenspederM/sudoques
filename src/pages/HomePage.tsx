import { Play, Settings as SettingsIcon, Trophy } from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { BrandHeader } from "@/components/BrandHeader";
import { Layout } from "@/components/Layout";
import {
	StaggeredList,
	StaggeredListElement,
} from "@/components/StaggeredList";

interface HomePageProps {
	hasExistingGame: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ hasExistingGame }) => {
	const navigate = useNavigate();

	return (
		<Layout centered>
			<StaggeredList>
				<StaggeredListElement className="flex flex-col items-center mb-8">
					<BrandHeader />
				</StaggeredListElement>
				{hasExistingGame && (
					<StaggeredListElement type="button" onClick={() => navigate("/game")}>
						<Play size={24} fill="currentColor" />
						<span>Continue Game</span>
					</StaggeredListElement>
				)}
				<StaggeredListElement
					type="button"
					onClick={() => navigate("/new-game")}
					variant="brand"
				>
					<Play size={24} fill="currentColor" />
					<span>New Game</span>
				</StaggeredListElement>
				<div className="grid grid-cols-2 gap-4">
					<StaggeredListElement
						type="button"
						onClick={() => navigate("/statistics")}
					>
						<Trophy size={20} className="text-yellow-400" />
						<span>Statistics</span>
					</StaggeredListElement>

					<StaggeredListElement
						type="button"
						onClick={() =>
							navigate("/settings", { state: { activeDiff: "easy" } })
						}
					>
						<SettingsIcon size={20} />
						<span>Settings</span>
					</StaggeredListElement>
				</div>
			</StaggeredList>
		</Layout>
	);
};
