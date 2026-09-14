import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ChallengeProvider, useChallenge } from "@/context/ChallengeContext";
import {
	SelectedMemberProvider,
	useSelectedMember,
} from "@/context/SelectedMemberContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { LoadingState } from "@/components/layout/LoadingState";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { Body, Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui/feedback";

import { RootRedirect } from "@/pages/RootRedirect";
import { SignInPage } from "@/pages/SignInPage";
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
	const navigate = useNavigate();
	return (
		<Screen>
			<Body>
				<EmptyState
					title="No challenge at this link"
					body="The link may be mistyped, or the challenge may have been deleted. Check the link with whoever shared it."
					action={{ label: "Start a challenge", onClick: () => navigate("/new") }}
				/>
			</Body>
		</Screen>
	);
}

function ErrorPage({ message }: { message: string }) {
	return (
		<Screen>
			<Body>
				<EmptyState
					title="Couldn't load the challenge"
					body={message}
					action={{ label: "Try again", onClick: () => window.location.reload() }}
				/>
			</Body>
		</Screen>
	);
}

// ── App router ────────────────────────────────────────────────────────────────

/**
 * Nothing renders until Firebase has restored any existing session.
 *
 * Every security rule requires `request.auth`, so a Firestore read issued
 * before auth resolves fails with permission-denied — which would look like a
 * broken app rather than a signed-out one.
 */
function RequireAuth({ children }: { children: ReactNode }) {
	const { user, loading } = useAuth();
	if (loading) return <LoadingState message="Signing you in…" />;
	if (!user) return <SignInPage />;
	return <>{children}</>;
}

export function App() {
	return (
		<AuthProvider>
			<RequireAuth>
				<AppRoutes />
			</RequireAuth>
		</AuthProvider>
	);
}

function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<RootRedirect />} />
			<Route path="/new" element={<CreateChallengePage />} />

			<Route path="/c/:slug" element={<ChallengeSlugLayout />}>
				{/* No-chrome routes (no BottomNav) */}
				<Route path="pick" element={<RouteEB><PickMemberPage /></RouteEB>} />

				{/* Chrome routes (with BottomNav via Layout) */}
				<Route element={<ChromeLayout />}>
					{/*
					 * Home is the landing screen and Log day is its primary CTA, per the
					 * design. Both need a member: Home is entirely personal (your points,
					 * your rank, your day), and Log obviously is. Board, History, Rules and
					 * member profiles stay open so a shared link still opens on something.
					 */}
					<Route
						index
						element={
							<RouteEB>
								<RequireMember>
									<ChallengeHomePage />
								</RequireMember>
							</RouteEB>
						}
					/>
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
					{/* Kept so bookmarks from the previous layout still resolve. */}
					<Route path="home" element={<Navigate to=".." replace relative="path" />} />
					<Route path="board" element={<RouteEB><LeaderboardPage /></RouteEB>} />
					<Route path="history" element={<RouteEB><HistoryPage /></RouteEB>} />
					<Route path="m/:memberId" element={<RouteEB><MemberProfilePage /></RouteEB>} />
					<Route path="rules" element={<RouteEB><RulesReferencePage /></RouteEB>} />
					<Route path="admin" element={<RouteEB><AdminPage /></RouteEB>} />
				</Route>
			</Route>

			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
