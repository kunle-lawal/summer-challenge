import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { ChallengeProvider, useChallenge } from "@/context/ChallengeContext";
import {
	SelectedMemberProvider,
	useSelectedMember,
} from "@/context/SelectedMemberContext";
import { AdminModeProvider } from "@/context/AdminModeContext";
import { Layout } from "@/components/layout/Layout";
import { LoadingState } from "@/components/layout/LoadingState";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

import { RootRedirect } from "@/pages/RootRedirect";
import { CreateChallengePage } from "@/pages/CreateChallengePage";
import { ChallengeHomePage } from "@/pages/ChallengeHomePage";
import { PickMemberPage } from "@/pages/PickMemberPage";
import { LogDayPage } from "@/pages/LogDayPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { MemberProfilePage } from "@/pages/MemberProfilePage";
import { AdminPage } from "@/pages/AdminPage";
import { RulesReferencePage } from "@/pages/RulesReferencePage";

// ── Challenge slug layout ─────────────────────────────────────────────────────

function ChallengeSlugLayout() {
	const { slug } = useParams<{ slug: string }>();
	if (!slug) return <Navigate to="/" replace />;
	return (
		<ChallengeProvider slug={slug}>
			<ErrorBoundary>
				<ChallengeLoadWrapper />
			</ErrorBoundary>
		</ChallengeProvider>
	);
}

function ChallengeLoadWrapper() {
	const { challenge, loading, error, notFound, activeMembers } = useChallenge();

	if (loading) return <LoadingState message="Loading challenge…" />;
	if (notFound || !challenge) return <NotFound />;
	if (error) return <ErrorPage message={error} />;

	return (
		<SelectedMemberProvider slug={challenge.slug} activeMembers={activeMembers}>
			<Outlet />
		</SelectedMemberProvider>
	);
}

/** Layout wrapper used as a pathless route to add BottomNav to all chrome pages. */
function ChromeLayout() {
	return <Layout />;
}

// ── Admin layout (wraps admin sub-routes with AdminModeProvider) ──────────────

function AdminLayout() {
	const { challenge } = useChallenge();
	return (
		<AdminModeProvider
			challengeId={challenge?.id}
			ownerPasswordHash={challenge?.ownerPasswordHash}
			ownerPasswordSalt={challenge?.ownerPasswordSalt}
		>
			<Outlet />
		</AdminModeProvider>
	);
}

// ── Per-route error boundary ──────────────────────────────────────────────────

/** Wraps a page element with an ErrorBoundary so crashes are contained. */
function RouteEB({ children }: { children: ReactNode }) {
	return <ErrorBoundary>{children}</ErrorBoundary>;
}

// ── Guards ────────────────────────────────────────────────────────────────────

function RequireMember({ children }: { children: ReactNode }) {
	const { selectedMemberId, isOrphaned } = useSelectedMember();
	const { slug } = useParams<{ slug: string }>();
	if (!selectedMemberId || isOrphaned) {
		return <Navigate to={`/c/${slug}/pick`} replace />;
	}
	return <>{children}</>;
}

// ── Utility pages ─────────────────────────────────────────────────────────────

function NotFound() {
	return (
		<div style={{ padding: "40px 24px", textAlign: "center" }}>
			<p style={{ fontSize: 14, opacity: 0.5 }}>Challenge not found.</p>
			<a href="/" style={{ marginTop: 12, display: "block", fontSize: 13, textDecoration: "underline" }}>
				Go home
			</a>
		</div>
	);
}

function ErrorPage({ message }: { message: string }) {
	return (
		<div style={{ padding: "40px 24px" }}>
			<p style={{ fontSize: 14, color: "#9a3412" }}>{message}</p>
		</div>
	);
}

// ── App router ────────────────────────────────────────────────────────────────

export function App() {
	return (
		<Routes>
			<Route path="/" element={<RootRedirect />} />
			<Route path="/new" element={<CreateChallengePage />} />

			<Route path="/c/:slug" element={<ChallengeSlugLayout />}>
				{/* No-chrome routes (no BottomNav) */}
				<Route path="pick" element={<RouteEB><PickMemberPage /></RouteEB>} />

				{/* Chrome routes (with BottomNav via Layout) */}
				<Route element={<ChromeLayout />}>
					<Route index element={<RouteEB><ChallengeHomePage /></RouteEB>} />
					<Route
						path="log"
						element={
							<RouteEB>
								<RequireMember>
									<LogDayPage />
								</RequireMember>
							</RouteEB>
						}
					/>
					<Route path="board" element={<RouteEB><LeaderboardPage /></RouteEB>} />
					<Route path="history" element={<RouteEB><HistoryPage /></RouteEB>} />
					<Route path="m/:memberId" element={<RouteEB><MemberProfilePage /></RouteEB>} />
					<Route path="rules" element={<RouteEB><RulesReferencePage /></RouteEB>} />
					<Route path="admin" element={<AdminLayout />}>
						<Route index element={<RouteEB><AdminPage /></RouteEB>} />
					</Route>
				</Route>
			</Route>

			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
