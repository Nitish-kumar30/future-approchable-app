import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PricingCurrencyProvider } from "@/hooks/usePricingCurrency";
import { ThemeModeProvider } from "@/hooks/useThemeMode";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Cohorts from "./pages/Cohorts";
import CohortDetail from "./pages/CohortDetail";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LiveCourses from "./pages/LiveCourses";
import CourseLearn from "./pages/CourseLearn";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OnDemandCourseDetail from "./pages/OnDemandCourseDetail";
import PromptLibrary from "./pages/PromptLibrary";
import Resources from "./pages/Resources";
import Registration from "./pages/Registration";
import NotFound from "./pages/NotFound";
import VerifyCertificate from "./pages/VerifyCertificate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
    <AuthProvider>
      <PricingCurrencyProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/live-courses" element={<LiveCourses />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cohorts" element={<Cohorts />} />
            <Route path="/cohorts/:id" element={<CohortDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/courses/:slug/learn" element={<CourseLearn />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/free" element={<Navigate to="/courses?tab=free" replace />} />
            <Route path="/on-demand" element={<Navigate to="/courses?tab=free" replace />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/prompts" element={<PromptLibrary />} />
            <Route path="/on-demand/:slug" element={<OnDemandCourseDetail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/registration" element={<Registration />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </PricingCurrencyProvider>
    </AuthProvider>
    </ThemeModeProvider>
  </QueryClientProvider>
);

export default App;
