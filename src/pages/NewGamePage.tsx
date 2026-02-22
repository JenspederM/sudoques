import { Play } from "lucide-react";
import type React from "react";
import { PageTitle } from "@/components/PageTitle";
import {
	StaggeredList,
	StaggeredListElement,
} from "@/components/StaggeredList";
import { Layout } from "../components/Layout";
import { DIFFICULTIES } from "../logic/constants";
import type { Difficulty } from "../types";

interface NewGamePageProps {
	onSelectDifficulty: (difficulty: Difficulty) => void;
}

export const NewGamePage: React.FC<NewGamePageProps> = ({
	onSelectDifficulty,
}) => {
	return (
		<Layout backRedirect="/" headerCenter={<PageTitle title="New Game" />}>
			<StaggeredList className="overflow-y-auto sm:overflow-visible h-full">
				{DIFFICULTIES.map((d) => (
					<StaggeredListElement
						key={d.id}
						onClick={() => onSelectDifficulty(d.id)}
						type="button"
						className="justify-between"
						whileHover={{
							borderColor: "var(--brand-primary)",
							color: "var(--brand-primary)",
							backgroundColor: "var(--brand-primary-light)",
						}}
					>
						<div className="flex flex-col gap-1 items-start text-left flex-1 min-w-0">
							<h3 className="text-2xl font-black group-hover:text-brand-primary transition-colors truncate w-full">
								{d.label}
							</h3>
							<p className="text-text-secondary text-sm font-medium line-clamp-2">
								{d.desc}
							</p>
						</div>

						<div className="w-12 h-12 shrink-0 rounded-2xl bg-surface-input group-hover:bg-brand-primary group-hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95">
							<Play size={20} fill="currentColor" />
						</div>
					</StaggeredListElement>
				))}
			</StaggeredList>
		</Layout>
	);
};
