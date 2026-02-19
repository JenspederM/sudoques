import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const UpdateNotification = () => {
	const {
		needRefresh: [needRefresh, setNeedRefresh],
		updateServiceWorker,
	} = useRegisterSW({
		onRegistered(r: ServiceWorkerRegistration | undefined) {
			console.debug(`SW Registered: `, r);
		},
		onRegisterError(error: unknown) {
			toast.error("SW registration error", {
				description: error as string,
			});
		},
	});

	useEffect(() => {
		if (needRefresh) {
			toast("App Update Available", {
				description: "Update the app to get the latest features.",
				icon: (
					<RefreshCw
						size={18}
						className="text-brand-primary animate-spin-slow"
					/>
				),
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: "Reload",
					onClick: () => updateServiceWorker(true),
				},
				cancel: {
					label: "Dismiss",
					onClick: () => setNeedRefresh(false),
				},
			});
		}
	}, [needRefresh, setNeedRefresh, updateServiceWorker]);

	return null;
};
