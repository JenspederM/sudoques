import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type React from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MotionCard } from "./MotionCard";

type LayoutProps = PropsWithChildren<{
	backRedirect?: string;
	headerClassName?: string;
	headerChildren?: React.ReactNode;
	contentClassName?: string;
}>;

export const Layout: React.FC<LayoutProps> = ({
	children,
	headerClassName,
	backRedirect,
	headerChildren,
	contentClassName,
}) => {
	const navigate = useNavigate();
	return (
		<div className="min-h-screen w-full overflow-hidden relative bg-slate-950">
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
						{headerChildren && backRedirect && (
							<MotionCard
								className={cn(
									"w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 shadow-xl",
									headerClassName,
								)}
							>
								<button
									type="button"
									onClick={() => navigate(backRedirect)}
									className="py-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
								>
									<ChevronLeft size={28} />
								</button>
								{headerChildren}
							</MotionCard>
						)}
						{children}
					</div>
				</div>
			</motion.main>
		</div>
	);
};
