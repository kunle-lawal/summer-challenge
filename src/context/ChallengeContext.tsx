import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { isScriptConfigured, SCRIPT_URL } from "../lib/config";
import type { ChallengeCache } from "../lib/sheets";
import { cacheFromPayload, fetchSheetsJson, postToSheets } from "../lib/sheets";

export interface ChallengeContextValue extends ChallengeCache {
	loading: boolean;
	initError: string | null;
	syncing: boolean;
	/** Bumps when server-side clearAll succeeds (reset local forms). */
	clearGeneration: number;
	refreshFromSheets: () => Promise<void>;
	/** Merge updates into cache (e.g. after save). */
	updateCache: (fn: (prev: ChallengeCache) => ChallengeCache) => void;
	clearAllLocal: () => void;
	checkPassword: (key: string, input: string) => boolean;
	postToSheets: (action: string, data: unknown) => Promise<void>;
}

const emptyCache = (): ChallengeCache => ({
	entries: [],
	profiles: {},
	passwords: {},
	resetLog: [],
});

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export function ChallengeProvider({ children }: { children: ReactNode }) {
	const [cache, setCache] = useState<ChallengeCache>(emptyCache);
	const [loading, setLoading] = useState(true);
	const [initError, setInitError] = useState<string | null>(null);
	const [syncing, setSyncing] = useState(false);
	const [clearGeneration, setClearGeneration] = useState(0);

	const refreshFromSheets = useCallback(async () => {
		if (!isScriptConfigured()) return;
		setSyncing(true);
		try {
			const data = await fetchSheetsJson(SCRIPT_URL);
			setCache(cacheFromPayload(data));
		} catch (err) {
			console.error("refreshFromSheets failed:", err);
		} finally {
			setSyncing(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			if (!isScriptConfigured()) {
				if (!cancelled) {
					console.error("SCRIPT_URL not set — add VITE_SCRIPT_URL to .env");
					setInitError("Something went wrong. Please try again.");
					setLoading(false);
				}
				return;
			}

			try {
				const data = await fetchSheetsJson(SCRIPT_URL);
				if (!cancelled) setCache(cacheFromPayload(data));
			} catch (err) {
				console.error("Failed to load from Sheets:", err);
				if (!cancelled) {
					console.error(
						"Could not connect to Google Sheets. Check VITE_SCRIPT_URL and try refreshing.",
					);
					setInitError("Something went wrong. Please try again.");
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void init();
		return () => {
			cancelled = true;
		};
	}, []);

	const updateCache = useCallback(
		(fn: (prev: ChallengeCache) => ChallengeCache) => {
			setCache(fn);
		},
		[],
	);

	const clearAllLocal = useCallback(() => {
		setCache(emptyCache());
		setClearGeneration((g) => g + 1);
	}, []);

	const checkPassword = useCallback(
		(key: string, input: string) => {
			return (cache.passwords[key] ?? "1234") === String(input);
		},
		[cache.passwords],
	);

	const post = useCallback(async (action: string, data: unknown) => {
		await postToSheets(SCRIPT_URL, action, data);
	}, []);

	const value = useMemo<ChallengeContextValue>(
		() => ({
			...cache,
			loading,
			initError,
			syncing,
			clearGeneration,
			refreshFromSheets,
			updateCache,
			clearAllLocal,
			checkPassword,
			postToSheets: post,
		}),
		[
			cache,
			loading,
			initError,
			syncing,
			clearGeneration,
			refreshFromSheets,
			updateCache,
			clearAllLocal,
			checkPassword,
			post,
		],
	);

	return (
		<ChallengeContext.Provider value={value}>
			{children}
		</ChallengeContext.Provider>
	);
}

export function useChallenge(): ChallengeContextValue {
	const ctx = useContext(ChallengeContext);
	if (!ctx)
		throw new Error("useChallenge must be used within ChallengeProvider");
	return ctx;
}
