import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type React from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MotionCard } from "./MotionCard";

type LayoutProps = PropsWithChildren<{
	backRedirect?: string;
	backState?: unknown;
	headerClassName?: string;
	headerCenter?: React.ReactNode;
	headerRight?: React.ReactNode;
	contentClassName?: string;
}>;

export const Layout: React.FC<LayoutProps> = ({
	children,
	headerClassName,
	backRedirect,
	backState,
	headerCenter,
	headerRight,
	contentClassName,
}) => {
	const navigate = useNavigate();
	return (
		<div className="min-h-screen w-full overflow-hidden relative bg-surface-main">
			{/* Animated Background Blobs */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
			</div>

			<motion.main
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.3 }}
				className="relative z-10 w-full min-h-screen"
			>
				<div className="safe flex flex-col items-center min-h-screen">
					<div
						className={cn(
							"w-full flex flex-col sm:justify-center grow items-center gap-4 sm:gap-6 max-w-xl",
							contentClassName,
						)}
					>
						{backRedirect && (
							<MotionCard
								className={cn(
									"w-full grid grid-cols-3 items-center p-3 sm:p-4 rounded-2xl border border-border-subtle shadow-xl",
									headerClassName,
								)}
							>
								<div className="flex justify-start">
									<button
										type="button"
										onClick={() => navigate(backRedirect, { state: backState })}
										className="p-2 hover:bg-surface-hover rounded-xl transition-all active:scale-90"
									>
										<ChevronLeft size={28} />
									</button>
								</div>

								<div className="flex justify-center flex-1 whitespace-nowrap">
									{headerCenter}
								</div>

								<div className="flex justify-end">{headerRight}</div>
							</MotionCard>
						)}
						{children}
					</div>
				</div>
			</motion.main>
		</div>
	);
};
