import { AnimatePresence, m, useReducedMotionConfig } from "framer-motion";
import type { PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { getMotionExit, getMotionInitial } from "@/lib/motion";
import { cn } from "@/lib/utils";

type DialogProps = PropsWithChildren<{
	open: boolean;
	onClose?: () => void;
	className?: string;
}>;

export function Dialog({ open, onClose, className, children }: DialogProps) {
	const shouldReduceMotion = useReducedMotionConfig();

	return createPortal(
		<AnimatePresence initial={!shouldReduceMotion}>
			{open && (
				<m.div
					initial={getMotionInitial(shouldReduceMotion, { opacity: 0 })}
					animate={{ opacity: 1 }}
					exit={getMotionExit(shouldReduceMotion, { opacity: 0 })}
					onClick={onClose}
					data-testid="dialog-overlay"
					className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md p-6"
				>
					<m.div
						initial={getMotionInitial(shouldReduceMotion, {
							scale: 0.9,
							y: 20,
						})}
						animate={{ scale: 1, y: 0 }}
						exit={getMotionExit(shouldReduceMotion, {
							scale: 0.9,
							y: 20,
						})}
						onClick={(e) => e.stopPropagation()}
						data-testid="dialog-content"
						className={cn(
							"bg-glass p-8 sm:p-10 rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl",
							className,
						)}
					>
						{children}
					</m.div>
				</m.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
