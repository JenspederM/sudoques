import {
	type HTMLMotionProps,
	m,
	stagger,
	type TargetAndTransition,
	useReducedMotionConfig,
	type Variants,
} from "framer-motion";
import {
	type PointerEvent,
	type PropsWithChildren,
	useSyncExternalStore,
} from "react";
import { getMotionInitial } from "@/lib/motion";
import { cn } from "@/lib/utils";

const hoverMediaQuery = "(hover: hover) and (pointer: fine)";

function subscribeToHoverCapability(onChange: () => void) {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return () => {};
	}

	const mediaQuery = window.matchMedia(hoverMediaQuery);
	mediaQuery.addEventListener("change", onChange);
	return () => mediaQuery.removeEventListener("change", onChange);
}

function getHoverCapability() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia(hoverMediaQuery).matches
	);
}

function useHoverCapability() {
	return useSyncExternalStore(
		subscribeToHoverCapability,
		getHoverCapability,
		() => false,
	);
}

const listVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			delayChildren: stagger(0.1),
		},
	},
};

export function StaggeredList({
	children,
	className,
	...props
}: PropsWithChildren<HTMLMotionProps<"div">>) {
	const shouldReduceMotion = useReducedMotionConfig();

	return (
		<m.div
			variants={listVariants}
			initial={getMotionInitial(shouldReduceMotion, "hidden")}
			animate="visible"
			{...props}
			className={cn("w-full flex flex-col gap-4", className)}
		>
			{children}
		</m.div>
	);
}

type StaggeredListElementOptions = {
	variant?: "brand" | "default" | "transparent";
	whileHover?: TargetAndTransition;
	whileTap?: TargetAndTransition;
};

type StaggeredListButtonProps = PropsWithChildren<
	Omit<HTMLMotionProps<"button">, "type"> &
		StaggeredListElementOptions & {
			type: "button";
		}
>;

type StaggeredListDivProps = PropsWithChildren<
	HTMLMotionProps<"div"> &
		StaggeredListElementOptions & {
			type?: "card";
		}
>;

type StaggeredListElementProps =
	| StaggeredListButtonProps
	| StaggeredListDivProps;

export function StaggeredListElement(props: StaggeredListElementProps) {
	const canHover = useHoverCapability();
	const { children, type, variant, className, whileHover, whileTap } = props;
	const elementVariants: Variants = {
		hidden: { opacity: 0, y: 20 },
		hovering: {
			scale: 1.02,
			transition: {
				duration: 0.1,
			},
			...(whileHover && typeof whileHover === "object" ? whileHover : {}),
		},
		tap: {
			scale: 0.98,
			transition: {
				duration: 0.05,
			},
			...(whileTap && typeof whileTap === "object" ? whileTap : {}),
		},
		visible: {
			opacity: 1,
			y: 0,
		},
	};
	const defaultPadding = "px-6 py-4";
	const defaultShadow = "shadow-lg shadow-border/10";
	const defaultBorder = "border border-border";
	const variantStyles = {
		brand: `${defaultPadding} bg-primary text-white ${defaultShadow} ${defaultBorder}`,
		default: `${defaultPadding} bg-glass text-foreground ${defaultShadow} ${defaultBorder}`,
		transparent: "bg-transparent text-foreground drop-shadow-none",
	};
	if (type === "button") {
		const {
			children: _children,
			className: _className,
			type: _type,
			variant: _variant,
			whileHover: _whileHover,
			whileTap: _whileTap,
			onPointerUp,
			...buttonProps
		} = props;
		const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
			onPointerUp?.(event);
			if (!event.defaultPrevented && event.pointerType === "touch") {
				event.currentTarget.blur();
			}
		};

		return (
			<m.button
				{...buttonProps}
				type="button"
				variants={elementVariants}
				whileHover={canHover ? "hovering" : undefined}
				whileTap="tap"
				className={cn(
					"flex w-full touch-manipulation appearance-none items-center justify-center gap-4 rounded-2xl font-bold text-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
					variantStyles[variant || "default"],
					className,
				)}
				onPointerUp={handlePointerUp}
			>
				{children}
			</m.button>
		);
	}

	const {
		children: _children,
		className: _className,
		type: _type,
		variant: _variant,
		whileHover: _whileHover,
		whileTap: _whileTap,
		...divProps
	} = props;
	if (type === "card") {
		return (
			<m.div
				{...divProps}
				variants={elementVariants}
				className={cn(
					"rounded-2xl",
					variantStyles[variant || "default"],
					className,
				)}
			>
				{children}
			</m.div>
		);
	}
	return (
		<m.div {...divProps} variants={elementVariants} className={className}>
			{children}
		</m.div>
	);
}
