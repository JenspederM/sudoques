import { m } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type React from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type LayoutProps = PropsWithChildren<{
	backRedirect?: string;
	backState?: unknown;
	headerClassName?: string;
	headerCenter?: React.ReactNode;
	headerRight?: React.ReactNode;
	centered?: boolean;
}>;

export const Layout: React.FC<LayoutProps> = ({
	children,
	headerClassName,
	backRedirect,
	backState,
	headerCenter,
	headerRight,
	centered,
}) => {
	const hasHeader = backRedirect && (headerCenter || headerRight);
	return (
		<div className="flex flex-col fixed inset-0 w-full min-h-0 h-dvh overflow-hidden items-center justify-center overscroll-contain bg-background">
			{/* Animated Background Blobs */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
			</div>
			<m.main
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.3 }}
				className={cn(
					"safe flex flex-col h-full w-full max-w-xl sm:justify-center",
					centered && "justify-center",
				)}
				layout
			>
				{hasHeader && (
					<Header
						backRedirect={backRedirect}
						backState={backState}
						headerClassName={headerClassName}
						headerCenter={headerCenter}
						headerRight={headerRight}
					/>
				)}
				{children}
			</m.main>
		</div>
	);
};

type HeaderProps = {
	backRedirect: string;
	backState: unknown;
	headerClassName?: string;
	headerCenter?: React.ReactNode;
	headerRight?: React.ReactNode;
};

function Header({
	backRedirect,
	backState,
	headerClassName,
	headerCenter,
	headerRight,
}: HeaderProps) {
	const navigate = useNavigate();
	return (
		<m.div
			className={cn(
				"bg-glass w-full grid grid-cols-3 items-center p-3 sm:p-4 rounded-2xl border border-border shadow-xl mb-6",
				headerClassName,
			)}
		>
			<div className="flex justify-start">
				<button
					type="button"
					onClick={() => navigate(backRedirect, { state: backState })}
					className="p-2 hover:bg-accent rounded-xl active:scale-90"
					data-testid="back-button"
				>
					<ChevronLeft size={28} />
				</button>
			</div>

			<div className="flex justify-center flex-1 whitespace-nowrap">
				{headerCenter}
			</div>

			<div className="flex justify-end">{headerRight}</div>
		</m.div>
	);
}
