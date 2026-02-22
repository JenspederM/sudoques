import { cn } from "@/lib/utils";

type ThemeButtonProps = {
	label: string;
	icon: React.ReactNode;
	onChange: () => void;
	isActive: boolean;
};

export function ThemeButton({
	label,
	icon,
	onChange,
	isActive,
}: ThemeButtonProps) {
	return (
		<button
			type="button"
			onClick={onChange}
			className={cn(
				"group flex flex-col items-center gap-3 p-4 rounded-2xl border-1",
				isActive
					? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
					: "border-transparent hover:bg-accent bg-glass border-border",
			)}
		>
			<div
				className={cn(
					`w-12 h-12 rounded-full shadow-inner flex items-center justify-center`,
				)}
			>
				{icon}
			</div>
			<span
				className={cn(
					"font-bold",
					isActive ? "text-foreground" : "text-foreground",
				)}
			>
				{label}
			</span>
		</button>
	);
}
