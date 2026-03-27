import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AuthGuard } from "./auth/AuthGuard";
import { BodyModelPage } from "./pages/BodyModelPage";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { SetNamePage } from "./pages/SetNamePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ProfilePage } from "./pages/ProfilePage";
import { StatsPage } from "./pages/StatsPage";
import { ExerciseProgressPage } from "./pages/ExerciseProgressPage";
import { AppShell } from "./components/layout/AppShell";
import { CategoryList } from "./components/categories/CategoryList";
import { ExerciseListPage } from "./components/exercises/ExerciseListPage";
import { CompletedWorkoutsList } from "./components/history/CompletedWorkoutsList";
import { WorkoutDetailView } from "./components/history/WorkoutDetailView";
import { ThemeProvider } from "./components/layout/ThemeProvider";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Body model test page (standalone) */}
            <Route path="/body" element={<BodyModelPage />} />

            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Auth email callback */}
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* First-time onboarding (auth required, no name required) */}
            <Route path="/set-name" element={<SetNamePage />} />

            {/* Protected routes */}
            <Route
              element={
                <AuthGuard>
                  <AppShell />
                </AuthGuard>
              }
            >
              <Route path="/" element={<CategoryList />} />
              <Route path="/category/:id" element={<ExerciseListPage />} />
              <Route path="/history" element={<CompletedWorkoutsList />} />
              <Route path="/history/:sessionId" element={<WorkoutDetailView />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/stats/exercise/:exerciseId" element={<ExerciseProgressPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
