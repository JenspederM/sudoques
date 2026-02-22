import { Play } from "lucide-react";
import type React from "react";
import { Layout } from "@/components/Layout";
import { PageTitle } from "@/components/PageTitle";
import {
	StaggeredList,
	StaggeredListElement,
} from "@/components/StaggeredList";
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
			<StaggeredList className="overflow-auto sm:overflow-visible h-full">
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
						<div className="flex flex-col">
							<h3>{d.label}</h3>
							<p className="text-xs text-text-muted font-medium tracking-wide">
								{d.desc}
							</p>
						</div>
						<div className="grid place-items-center size-12 rounded-2xl bg-surface-input">
							<Play size={20} fill="currentColor" />
						</div>
					</StaggeredListElement>
				))}
			</StaggeredList>
		</Layout>
	);
};
