import { AnimatePresence, motion } from "framer-motion";
import { type PropsWithChildren, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MotionCard } from "./MotionCard";

type DialogProps = PropsWithChildren<{
	open: boolean;
	onClose?: () => void;
	className?: string;
}>;

export function Dialog({ open, onClose, className, children }: DialogProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md p-6"
				>
					<MotionCard
						initial={{ scale: 0.9, y: 20 }}
						animate={{ scale: 1, y: 0 }}
						exit={{ scale: 0.9, y: 20 }}
						onClick={(e) => e.stopPropagation()}
						className={`glass p-8 sm:p-10 rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl ${
							className || ""
						}`}
					>
						{children}
					</MotionCard>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
