import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
	getHapticPattern,
	type HapticCue,
	readHapticsEnabled,
	writeHapticsEnabled,
} from "@/lib/haptics";

interface HapticsContextValue {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
	trigger: (cue: HapticCue) => void;
	cancel: () => void;
}

const HapticsContext = createContext<HapticsContextValue | undefined>(
	undefined,
);

export const HapticsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { trigger: triggerWebHaptic, cancel } = useWebHaptics();

	const [enabled, setEnabledState] = useState(() =>
		readHapticsEnabled(
			typeof window === "undefined" ? null : window.localStorage,
		),
	);

	const trigger = useCallback(
		(cue: HapticCue) => {
			if (!enabled) return;
			void triggerWebHaptic(getHapticPattern(cue));
		},
		[enabled, triggerWebHaptic],
	);

	const setEnabled = useCallback(
		(nextEnabled: boolean) => {
			if (nextEnabled === enabled) return;
			// Confirm the toggle while this click still has an active user gesture.
			void triggerWebHaptic(getHapticPattern("mode"));
			setEnabledState(nextEnabled);
			writeHapticsEnabled(
				typeof window === "undefined" ? null : window.localStorage,
				nextEnabled,
			);
		},
		[enabled, triggerWebHaptic],
	);

	return (
		<HapticsContext.Provider value={{ enabled, setEnabled, trigger, cancel }}>
			{children}
		</HapticsContext.Provider>
	);
};

export function useHaptics() {
	const context = useContext(HapticsContext);
	if (!context) {
		throw new Error("useHaptics must be used within a HapticsProvider");
	}
	return context;
}
